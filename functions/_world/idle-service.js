import {characterLook} from '../api/rpg-character.js';
import {snapshotGet} from '../api/rpg-snapshot.js';
import {activeWorkSQL,pendingJobSQL} from '../api/work-duty.js';
import {startJourney} from './idle-expedition.js';
import {pickSupporters} from '../api/rpg-random-party.js';
import {PLAY} from '../../rpg-play-data.js';
import {dayAt,allCompanions,completeConstruction,GARDEN,HOUSE_STYLES,DYES,PERSONALITIES} from './idle-living.js';
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
const allowed=['begin','settle','settings','build','read','favorite','party','life_settings','layout','craft','plant','harvest','pet_name','restore','routine','companions','exterior','interior','construction','daily_claim','blueprint_save','blueprint_load','journey_start','journey_claim'];
const known=['owner_only','login_required','not_configured','disabled','invalid','begin_first','conflict','materials','max_home','already_owned','locked_chapter','choice_saved','save_invalid','clock_conflict','party_locked','layout_invalid','recipe_locked','gear_max','farm_busy','not_ready','request_conflict','restore_confirm','sync_required','client_version','construction_busy','party_limit','quest_incomplete','already_claimed','blueprint_limit','journey_active','no_journey','job_pending'];
async function synced(fn,request,env,body){const url=new URL(request.url);url.pathname='/api/'+(fn===play?'rpg-play':fn===work?'rpg-work':'rpg-life');url.search='';const headers=new Headers(request.headers);headers.delete('Content-Length');return fn({env,request:new Request(url,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})})});}
function decode(row){try{return valid(JSON.parse(row.state_json));}catch{throw Error('save_invalid');}}
async function completeSavedHome(db,id,row,now){
 for(let attempt=0;row&&attempt<3;attempt++){
  const raw=JSON.parse(row.state_json);
  if(!raw.construction||raw.construction.readyAt>now)return row;
  const s=decode(row);
  if(!completeConstruction(s,now))return row;
  raw.home=s.home;
  raw.garden=s.garden;
  raw.construction=null;
  // Keep the exact saved journey, layout, wallet, and clock cursor.
  await db.prepare('UPDATE idle270_state SET state_json=?,revision=revision+1,last_op=? WHERE public_id=? AND revision=?')
    .bind(JSON.stringify(raw),crypto.randomUUID(),id,row.revision).run();
  row=await getRow(db,id);
 }
 return row;
}
async function backupList(db,id){const items=await rows(db.prepare('SELECT revision,created_at,state_json FROM idle271_backups WHERE public_id=? ORDER BY revision DESC LIMIT 5').bind(id));return items.filter(item=>{try{decode(item);return true;}catch{return false;}}).map(({revision,created_at})=>({revision,created_at}));}
export async function onRequest({request,env}){try{
 env={...env,snapshotCache:new Map()};
 if(!['GET','POST'].includes(request.method))return json({error:'method'},405);
 const session=await idleSession(request,env),id=session.public_id,db=env.RPG_SUPPORT,now=Date.now(),url=new URL(request.url);
 if(env.RPG_IDLE_ENABLED==='0')return json({error:'disabled'},503);
 if(url.searchParams.get('access')==='1'&&request.method==='GET')return json({ok:true,private:false,release:275});
 if(request.method==='POST'&&(!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf))return json({error:'csrf'},403);
 if(url.searchParams.get('scout')==='1'&&request.method==='GET'){
  const snapshot=await snapshotGet(env,'yuzu_rpg_public_v1');
  const players=new Map((snapshot?.players||[]).map(p=>[p.id,p]));
  const criteria=`
    WHERE a.active=1 AND a.public_id<>? AND COALESCE(v.enabled,1)=1
      AND (SELECT COUNT(*) FROM web_mission_supporters x WHERE x.public_id=a.public_id AND x.day_key=?)<6
  `;
  const accounts=' FROM rpg_accounts a LEFT JOIN web_random_support_settings v ON v.public_id=a.public_id ';
  const read=(select,joins='')=>rows(db.prepare(select+accounts+joins+criteria).bind(id,dayAt(now)));
  let eligible;
  try{
   eligible=await read(`SELECT a.public_id,c.sprite,c.color,c.accessory,c.share_image,p.avatar_revision,
           CASE WHEN c.share_image=1 THEN LENGTH(p.avatar)>0 ELSE 0 END AS has_image`,
     `LEFT JOIN web_character c ON c.public_id=a.public_id
      LEFT JOIN web_profiles p ON p.public_id=a.public_id AND c.share_image=1`);
  }catch(error){
   if(!String(error.message).includes('no such table: web_character'))throw error;
   eligible=await read('SELECT a.public_id');
  }
  return json({candidates:eligible.flatMap(a=>{
   const p=players.get(a.public_id);
   if(!p)return [];
   const look=a.share_image?{sprite:a.sprite,color:a.color,accessory:a.accessory,
     image:a.has_image?'api/rpg-character?image='+a.public_id+'&v='+a.avatar_revision:null}:null;
   return [{name:p.name,level:Number.isSafeInteger(p.level)&&p.level>0?p.level:1,job:p.job||'未設定',look}];
  }).sort((a,b)=>a.name.localeCompare(b.name,'ja'))});
 }
 let row=await getRow(db,id);const savedRun=await db.prepare('SELECT run_json FROM idle274_runs WHERE public_id=?').bind(id).first();let durableJourney=savedRun?JSON.parse(savedRun.run_json):null;
 if(url.searchParams.get('recovery')==='1'&&request.method==='GET')return json({ok:true,revision:row?.revision??null,csrf:session.csrf,backups:await backupList(db,id)});
 if(request.method==='GET')row=await completeSavedHome(db,id,row,now);
 const claims=await rows(db.prepare("SELECT day_key,kind FROM idle272_claims WHERE public_id=? AND (day_key=? OR kind='birthday')").bind(id,dayAt(now)));
 const withClaims=s=>{if(s.companions)s.companions=s.companions.filter(g=>!g.startsWith('viewer_')||durableJourney?.guests.some(v=>'viewer_'+v.id===g));if(s.questDay!==dayAt(now)){s.questDay=dayAt(now);s.daily={gather:0,win:0,social:0,claimed:[]};}s.celebrations=[...new Set([...s.celebrations,...claims.filter(c=>c.kind==='birthday').map(c=>c.day_key)])];if(s.questDay===dayAt(now))s.daily.claimed=[...new Set([...s.daily.claimed,...claims.filter(c=>c.kind!=='birthday').map(c=>c.kind)])];return s;};
 let allowedViewers=new Set();if(durableJourney){const guests=await rows(db.prepare('SELECT a.public_id FROM rpg_accounts a LEFT JOIN web_random_support_settings s ON s.public_id=a.public_id WHERE a.active=1 AND COALESCE(s.enabled,1)=1'));const active=new Set(guests.map(g=>g.public_id));allowedViewers=active;durableJourney.guests=durableJourney.guests.filter(g=>active.has(g.id));}
 const snapshot=await snapshotGet(env,'yuzu_rpg_public_v1'),player=snapshot?.players?.find(p=>p.id===id);
 if(request.method==='POST'){
  const d=await readBody(request,8192);
  if(d.action==='activity'){const b=d.body;if(durableJourney&&!durableJourney.claimed&&['start','select'].includes(b?.action))throw Error('journey_active');if(!b||!['explore','work'].includes(d.service))throw Error('invalid');if(d.service==='explore'&&!['start','claim','shop','support_setting','echo_setting','residence'].includes(b.action)||d.service==='work'&&!['select','claim','end'].includes(b.action))throw Error('invalid');return synced(d.service==='explore'?play:work,request,env,b);}
  if(!allowed.includes(d.action))throw Error('invalid');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.requestId||''))throw Error('client_version');
  const payloadHash=await hash(JSON.stringify(d)),receipt=await db.prepare('SELECT payload_hash FROM idle271_receipts WHERE public_id=? AND request_id=?').bind(id,d.requestId).first();if(receipt&&receipt.payload_hash!==payloadHash)throw Error('request_conflict');
  if(!row){if(d.action!=='begin')throw Error('begin_first');await db.prepare('INSERT OR IGNORE INTO idle270_state(public_id,cursor_ms,state_json) VALUES(?,?,?)').bind(id,now,JSON.stringify(fresh(parseInt(id.slice(0,8),16)))).run();row=await getRow(db,id);}
  if(d.action!=='begin'&&!receipt){
   if(!Number.isSafeInteger(d.revision)||d.revision!==row.revision)throw Error('conflict');
   if(d.action==='restore'){
    if(d.confirm!=='RESTORE'||!Number.isInteger(d.backupRevision))throw Error('restore_confirm');const b=await db.prepare('SELECT * FROM idle271_backups WHERE public_id=? AND revision=?').bind(id,d.backupRevision).first();if(!b)throw Error('invalid');const restored=valid(JSON.parse(b.state_json)),last=await db.prepare('SELECT MAX(tick) tick FROM idle270_events WHERE public_id=?').bind(id).first();restored.ticks=Math.max(restored.ticks,last?.tick||0);try{const old=valid(JSON.parse(row.state_json));restored.read=[...new Set([...restored.read,...old.read])];restored.choices={...restored.choices,...old.choices};}catch{}row=await save(db,id,row,withClaims({...restored,journey:structuredClone(durableJourney),companions:null}),now,[],d,payloadHash);
   }else{
    if(!player)throw Error('sync_required');if(d.action==='daily_claim'&&claims.some(c=>c.day_key===dayAt(now)&&c.kind===d.quest))throw Error('already_claimed');const result=settle({...row,state_json:JSON.stringify(withClaims({...decode(row),journey:structuredClone(durableJourney)}))},now,{level:player.level,job:player.job}),s=withClaims(result.s),homeFinished=completeConstruction(s,now);
    if(d.action==='favorite'&&(!Number.isSafeInteger(d.tick)||d.tick<1||typeof d.favorite!=='boolean'))throw Error('invalid');
    if(d.action==='journey_start'){
 const blockers=await db.prepare('SELECT '+pendingJobSQL+' AS job,'+activeWorkSQL+" AS work, EXISTS(SELECT 1 FROM web_missions m JOIN web_mission_members p ON p.mission_id=m.id WHERE p.public_id=? AND m.status='running') AS mission").bind(id,id,id).first();
 if(blockers.job)throw Error('job_pending');if(blockers.work||blockers.mission)throw Error('journey_active');
 if(!['manual','random'].includes(d.partyMode))throw Error('invalid');let guests=[];if(d.partyMode==='random'){const ids=await pickSupporters({db,id,snapshot},dayAt(now));guests=ids.slice(0,3).map(g=>({id:g,name:snapshot.players.find(x=>x.id===g).name}));}
 const pool=allCompanions(s,ALLIES).filter(a=>a.at<=s.ticks&&!a.id.startsWith('viewer_'));for(let i=pool.length-1;i>0;i--){const n=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[pool[i],pool[n]]=[pool[n],pool[i]];}
 const members=d.partyMode==='random'?pool.slice(0,3-guests.length).map(a=>a.id):d.members;if(!Array.isArray(members)||members.length>3||new Set(members).size!==members.length||members.some(g=>!pool.some(a=>a.id===g)))throw Error('party_locked');
 const job=PLAY.jobs.find(j=>j.id===player.job||j.name===player.job)?.id||'warrior';startJourney(s,{...d,job},now,guests);s.companions=[...members,...guests.map(g=>'viewer_'+g.id)];s.partyCustomized=true;result.p.nextCursor=now;
 }else if(d.action==='journey_claim'){if(!s.journey||s.journey.claimed)throw Error('no_journey');s.journey.claimed=true;result.p.nextCursor=now;}else applyAction(s,d,now);
    if(d.action!=='settle'||result.events.length||result.fiveChanged||homeFinished||JSON.parse(row.state_json).idleVersion!==2)row=await save(db,id,row,s,result.p.nextCursor,result.events,d,payloadHash);
   }
  }
 }
 // Mutations must return the run just committed, not the snapshot read before
 // departure/return; otherwise the button and progress stay on the old screen.
 if(request.method==='POST'){const latest=await db.prepare('SELECT run_json FROM idle274_runs WHERE public_id=?').bind(id).first();if(latest){durableJourney=JSON.parse(latest.run_json);if(durableJourney){const eligible=await rows(db.prepare('SELECT a.public_id FROM rpg_accounts a LEFT JOIN web_random_support_settings s ON s.public_id=a.public_id WHERE a.active=1 AND COALESCE(s.enabled,1)=1'));allowedViewers=new Set(eligible.map(x=>x.public_id));durableJourney.guests=durableJourney.guests.filter(x=>allowedViewers.has(x.id));}}}
 const s=row?withClaims({...decode(row),journey:structuredClone(durableJourney)}):null;
 const services=await Promise.all([play,work,life].map(async(fn,i)=>{try{const r=await synced(fn,request,env);return {name:['explore','work','life'][i],ok:r.ok,status:r.status,data:await r.json()};}catch{return {name:['explore','work','life'][i],ok:false,status:503,data:{error:'service_unavailable'}};}}));
 const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER),q=(url.searchParams.get('q')||'').trim(),favorite=url.searchParams.get('favorite')==='1';if(!Number.isSafeInteger(before)||before<1||q.length>100)throw Error('invalid');
 const events=row?await rows(db.prepare('SELECT tick,at_ms,text,favorite,detail_json FROM idle270_events WHERE public_id=? AND tick<?'+(favorite?' AND favorite=1':'')+(q?" AND text LIKE ? ESCAPE '\\'":'')+' ORDER BY tick DESC LIMIT 30').bind(id,before,...(q?['%'+q.replace(/[\\%_]/g,m=>'\\'+m)+'%']:[]))):[];
 for(const e of events){try{e.detail=JSON.parse(e.detail_json);}catch{e.detail={};}delete e.detail_json;e.shareText=e.text;const names=(e.detail.joinedIds||[]).filter(g=>allowedViewers.has(g)).map(g=>snapshot?.players?.find(p=>p.id===g)?.name).filter(Boolean);if(names.length)e.text+=' 同行：'+names.join('・')+'。';}
 const character=await characterLook(db,id);
 const guestLooks=await Promise.all((durableJourney?.guests||[]).map(async guest=>({name:guest.name,look:await characterLook(db,guest.id,true)})));
 return json({ok:true,private:false,release:275,character,guestLooks:guestLooks.filter(g=>g.look),now,csrf:session.csrf,step:STEP,cap:CAP,revision:row?.revision??null,cursor:row?.cursor_ms??null,state:s,pending:row?projection(row,Math.max(row.cursor_ms,Math.min(now,s?.journey&&!s.journey.claimed?s.journey.end:row.cursor_ms))):null,focus:FOCUS,friends:FRIENDS,allies:s?allCompanions(s,ALLIES):ALLIES,garden:GARDEN,houseStyles:HOUSE_STYLES,dyes:DYES,personalities:PERSONALITIES,routes:ROUTES,recipes:RECIPES,materials:MATERIALS,skills:SKILLS,weather:weatherAt(now),backups:await backupList(db,id),town:await snapshotGet(env,'yuzu_town_public_v1'),chapters:s?CHAPTERS.map((c,i)=>{const unlocked=unlockedChapter(s,c,i),boss=Math.floor(i/2);return {id:i,title:c.title,at:c.at,unlocked,reason:!s.cleared.includes(boss)?ROUTES[boss].name+'を踏破すると読めます':'',...(unlocked?{text:c.text,speaker:c.speaker,choice:c.choice,read:s.read.includes(i),selected:s.choices[i]}:{})};}):[],events,services});
 }catch(e){const m=e.message;return json({error:known.includes(m)?m:'idle_unavailable'},m==='owner_only'?403:m==='login_required'?401:!known.includes(m)||['not_configured','disabled','save_invalid','sync_required'].includes(m)?503:409);}}
