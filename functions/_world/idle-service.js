import {dayAt,allCompanions,GARDEN,HOUSE_STYLES,DYES,PERSONALITIES} from './idle-living.js';
import {idleSession} from './idle-access.js';
import {json,sameOrigin} from '../api/town-support.js';
import {hash} from '../api/rpg-account.js';
import {readBody} from '../api/rpg-info.js';
import {onRequest as play} from '../api/rpg-play.js';
import {onRequest as work} from '../api/rpg-work.js';
import {onRequest as life} from '../api/rpg-life.js';
import {CHAPTERS,FOCUS,FRIENDS} from './idle-story.js';
import {ALLIES,ROUTES,RECIPES,MATERIALS,SKILLS,weatherAt} from './idle-content.js';
import {fresh,valid,projection,settle,unlockedChapter,STEP,CAP} from './idle-engine.js';
import {getRow,rows,save} from './idle-store.js';
import {applyAction} from './idle-actions.js';
const allowed=['begin','settle','settings','build','read','favorite','party','life_settings','layout','craft','plant','harvest','pet_name','restore','routine','companions','exterior','construction','daily_claim','blueprint_save','blueprint_load'];
const known=['owner_only','login_required','not_configured','disabled','invalid','begin_first','conflict','materials','max_home','already_owned','locked_chapter','choice_saved','save_invalid','clock_conflict','party_locked','layout_invalid','recipe_locked','gear_max','farm_busy','not_ready','request_conflict','restore_confirm','sync_required','client_version','construction_busy','party_limit','quest_incomplete','already_claimed','blueprint_limit'];
async function synced(fn,request,env,body){const url=new URL(request.url);url.pathname='/api/'+(fn===play?'rpg-play':fn===work?'rpg-work':'rpg-life');url.search='';const headers=new Headers(request.headers);headers.delete('Content-Length');return fn({env,request:new Request(url,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})})});}
function decode(row){try{return valid(JSON.parse(row.state_json));}catch{throw Error('save_invalid');}}
async function backupList(db,id){const items=await rows(db.prepare('SELECT revision,created_at,state_json FROM idle271_backups WHERE public_id=? ORDER BY revision DESC LIMIT 5').bind(id));return items.filter(item=>{try{decode(item);return true;}catch{return false;}}).map(({revision,created_at})=>({revision,created_at}));}
export async function onRequest({request,env}){try{
 if(!['GET','POST'].includes(request.method))return json({error:'method'},405);
 const session=await idleSession(request,env),id=session.public_id,db=env.RPG_SUPPORT,now=Date.now(),url=new URL(request.url);
 if(env.RPG_IDLE_ENABLED==='0')return json({error:'disabled'},503);
 if(url.searchParams.get('access')==='1'&&request.method==='GET')return json({ok:true,private:true,release:273});
 if(request.method==='POST'&&(!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf))return json({error:'csrf'},403);
 let row=await getRow(db,id);
 if(url.searchParams.get('recovery')==='1'&&request.method==='GET')return json({ok:true,revision:row?.revision??null,csrf:session.csrf,backups:await backupList(db,id)});
 const claims=await rows(db.prepare("SELECT day_key,kind FROM idle272_claims WHERE public_id=? AND (day_key=? OR kind='birthday')").bind(id,dayAt(now)));
 const withClaims=s=>{if(s.questDay!==dayAt(now)){s.questDay=dayAt(now);s.daily={gather:0,win:0,social:0,claimed:[]};}s.celebrations=[...new Set([...s.celebrations,...claims.filter(c=>c.kind==='birthday').map(c=>c.day_key)])];if(s.questDay===dayAt(now))s.daily.claimed=[...new Set([...s.daily.claimed,...claims.filter(c=>c.kind!=='birthday').map(c=>c.kind)])];return s;};
 const snapshot=await env.RPG_TOWN.get('yuzu_rpg_public_v1','json'),player=snapshot?.players?.find(p=>p.id===id);
 if(request.method==='POST'){
  const d=await readBody(request,8192);
  if(d.action==='activity'){const b=d.body;if(!b||!['explore','work'].includes(d.service))throw Error('invalid');if(d.service==='explore'&&!['start','claim','shop','support_setting','echo_setting','residence'].includes(b.action)||d.service==='work'&&!['select','claim','end'].includes(b.action))throw Error('invalid');return synced(d.service==='explore'?play:work,request,env,b);}
  if(!allowed.includes(d.action))throw Error('invalid');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.requestId||''))throw Error('client_version');
  const payloadHash=await hash(JSON.stringify(d)),receipt=await db.prepare('SELECT payload_hash FROM idle271_receipts WHERE public_id=? AND request_id=?').bind(id,d.requestId).first();if(receipt&&receipt.payload_hash!==payloadHash)throw Error('request_conflict');
  if(!row){if(d.action!=='begin')throw Error('begin_first');await db.prepare('INSERT OR IGNORE INTO idle270_state(public_id,cursor_ms,state_json) VALUES(?,?,?)').bind(id,now,JSON.stringify(fresh(parseInt(id.slice(0,8),16)))).run();row=await getRow(db,id);}
  if(d.action!=='begin'&&!receipt){
   if(!Number.isSafeInteger(d.revision)||d.revision!==row.revision)throw Error('conflict');
   if(d.action==='restore'){
    if(d.confirm!=='RESTORE'||!Number.isInteger(d.backupRevision))throw Error('restore_confirm');const b=await db.prepare('SELECT * FROM idle271_backups WHERE public_id=? AND revision=?').bind(id,d.backupRevision).first();if(!b)throw Error('invalid');const restored=valid(JSON.parse(b.state_json)),last=await db.prepare('SELECT MAX(tick) tick FROM idle270_events WHERE public_id=?').bind(id).first();restored.ticks=Math.max(restored.ticks,last?.tick||0);try{const old=valid(JSON.parse(row.state_json));restored.read=[...new Set([...restored.read,...old.read])];restored.choices={...restored.choices,...old.choices};}catch{}row=await save(db,id,row,withClaims(restored),now,[],d,payloadHash);
   }else{
    if(!player)throw Error('sync_required');if(d.action==='daily_claim'&&claims.some(c=>c.day_key===dayAt(now)&&c.kind===d.quest))throw Error('already_claimed');const result=settle({...row,state_json:JSON.stringify(withClaims(decode(row)))},now,{level:player.level,job:player.job}),s=withClaims(result.s);
    if(d.action==='favorite'&&(!Number.isSafeInteger(d.tick)||d.tick<1||typeof d.favorite!=='boolean'))throw Error('invalid');
    applyAction(s,d,now);
    if(d.action!=='settle'||result.events.length||JSON.parse(row.state_json).idleVersion!==2)row=await save(db,id,row,s,result.p.nextCursor,result.events,d,payloadHash);
   }
  }
 }
 const s=row?withClaims(decode(row)):null;
 const services=await Promise.all([play,work,life].map(async(fn,i)=>{try{const r=await synced(fn,request,env);return {name:['explore','work','life'][i],ok:r.ok,status:r.status,data:await r.json()};}catch{return {name:['explore','work','life'][i],ok:false,status:503,data:{error:'service_unavailable'}};}}));
 const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER),q=(url.searchParams.get('q')||'').trim(),favorite=url.searchParams.get('favorite')==='1';if(!Number.isSafeInteger(before)||before<1||q.length>100)throw Error('invalid');
 const events=row?await rows(db.prepare('SELECT tick,at_ms,text,favorite,detail_json FROM idle270_events WHERE public_id=? AND tick<?'+(favorite?' AND favorite=1':'')+(q?" AND text LIKE ? ESCAPE '\\'":'')+' ORDER BY tick DESC LIMIT 30').bind(id,before,...(q?['%'+q.replace(/[\\%_]/g,m=>'\\'+m)+'%']:[]))):[];
 for(const e of events){try{e.detail=JSON.parse(e.detail_json);}catch{e.detail={};}delete e.detail_json;}
 return json({ok:true,private:true,release:273,now,csrf:session.csrf,step:STEP,cap:CAP,revision:row?.revision??null,cursor:row?.cursor_ms??null,state:s,pending:row?projection(row,now):null,focus:FOCUS,friends:FRIENDS,allies:s?allCompanions(s,ALLIES):ALLIES,garden:GARDEN,houseStyles:HOUSE_STYLES,dyes:DYES,personalities:PERSONALITIES,routes:ROUTES,recipes:RECIPES,materials:MATERIALS,skills:SKILLS,weather:weatherAt(now),backups:await backupList(db,id),town:await env.RPG_TOWN.get('yuzu_town_public_v1','json'),chapters:s?CHAPTERS.map((c,i)=>{const unlocked=unlockedChapter(s,c,i),boss={3:0,7:2,11:5}[i];return {id:i,title:c.title,at:c.at,unlocked,reason:s.ticks<c.at?'暮らしの記録 '+c.at+'件で届きます':boss!==undefined&&!s.cleared.includes(boss)?ROUTES[boss].boss+'の討伐で届きます':'',...(unlocked?{text:c.text,speaker:c.speaker,choice:c.choice,read:s.read.includes(i),selected:s.choices[i]}:{})};}):[],events,services});
 }catch(e){const m=e.message;return json({error:known.includes(m)?m:'idle_unavailable'},m==='owner_only'?403:m==='login_required'?401:!known.includes(m)||['not_configured','disabled','save_invalid','sync_required'].includes(m)?503:409);}}
