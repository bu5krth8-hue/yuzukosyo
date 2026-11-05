import {ownerSession} from '../_world/access.js';
import {json,sameOrigin} from './town-support.js';
import {readBody} from './rpg-info.js';
import {onRequest as play} from './rpg-play.js';
import {onRequest as work} from './rpg-work.js';
import {onRequest as life} from './rpg-life.js';
import {CHAPTERS,FOCUS,FRIENDS} from '../_world/idle-story.js';
import {fresh,valid,projection,settle,STEP,CAP} from '../_world/idle-engine.js';
const getRow=(db,id)=>db.prepare('SELECT * FROM idle270_state WHERE public_id=?').bind(id).first();
const list=async q=>(await q.all()).results;
async function save(db,id,row,next,cursor,events=[]){const rev=row.revision+1,op=crypto.randomUUID(),guard='EXISTS(SELECT 1 FROM idle270_state WHERE public_id=? AND revision=? AND last_op=?)';const q=[db.prepare('UPDATE idle270_state SET revision=?,cursor_ms=?,state_json=?,last_op=? WHERE public_id=? AND revision=?').bind(rev,cursor,JSON.stringify(next),op,id,row.revision)];for(const e of events)q.push(db.prepare('INSERT INTO idle270_events(public_id,tick,at_ms,text) SELECT ?,?,?,? WHERE '+guard).bind(id,e.tick,e.at,e.text,id,rev,op));const r=await db.batch(q);if(r[0].meta.changes!==1)throw Error('conflict');return getRow(db,id);}
async function synced(fn,request,env,body){const url=new URL(request.url);url.pathname='/api/'+(fn===play?'rpg-play':fn===work?'rpg-work':'rpg-life');return fn({env,request:new Request(url,{method:body?'POST':'GET',headers:request.headers,...(body?{body:JSON.stringify(body)}:{})})});}
export async function onRequest({request,env}){try{
 if(!['GET','POST'].includes(request.method))return json({error:'method'},405);
 const session=await ownerSession(request,env),id=session.public_id,db=env.RPG_SUPPORT,now=Date.now();
 if(new URL(request.url).searchParams.get('access')==='1'&&request.method==='GET')return json({ok:true,private:true});
 if(request.method==='POST'&&(!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf))return json({error:'csrf'},403);
 let row=await getRow(db,id);
 if(request.method==='POST'){
  const d=await readBody(request,4096);
  if(d.action==='activity'){
   const b=d.body;if(!b||!['explore','work'].includes(d.service))throw Error('invalid');
   if(d.service==='explore'&&!['start','claim'].includes(b.action)||d.service==='work'&&!['select','claim','end'].includes(b.action))throw Error('invalid');
   return synced(d.service==='explore'?play:work,request,env,b);
  }
  if(!['begin','settle','settings','build','read','favorite'].includes(d.action))throw Error('invalid');
  if(!row){if(d.action!=='begin')throw Error('begin_first');await db.prepare('INSERT OR IGNORE INTO idle270_state(public_id,cursor_ms,state_json) VALUES(?,?,?)').bind(id,now,JSON.stringify(fresh())).run();row=await getRow(db,id);}
  if(d.action!=='begin'){
   if(!Number.isSafeInteger(d.revision)||d.revision!==row.revision)throw Error('conflict');
   const result=settle(row,now),s=result.s;let changed=result.p.count>0;
   if(d.action==='settings'){if(!Object.hasOwn(FOCUS,d.focus)||!Number.isInteger(d.coat)||d.coat<0||d.coat>5)throw Error('invalid');s.focus=d.focus;s.coat=d.coat;changed=true;}
   if(d.action==='build'){
    if(d.item==='home'){if(s.home>=5)throw Error('max_home');const wood=8*s.home,ore=3*s.home;if(s.wood<wood||s.ore<ore)throw Error('materials');s.wood-=wood;s.ore-=ore;s.home++;}
    else {const prices={lamp:3,table:4,flowers:2,books:5};if(!Object.hasOwn(prices,d.item))throw Error('invalid');if(s.furniture.includes(d.item))throw Error('already_owned');if(s.wood<prices[d.item])throw Error('materials');s.wood-=prices[d.item];s.furniture.push(d.item);}changed=true;
   }
   if(d.action==='read'){const c=CHAPTERS[d.chapter];if(!Number.isInteger(d.chapter)||!c||c.at>s.ticks||!Number.isInteger(d.choice)||d.choice<0||d.choice>1)throw Error('locked_chapter');if(s.read.includes(d.chapter)){if(s.choices[d.chapter]!==d.choice)throw Error('choice_saved');}else{s.read.push(d.chapter);s.choices[d.chapter]=d.choice;changed=true;}}
   if(d.action==='favorite'){if(!Number.isSafeInteger(d.tick)||d.tick<1||typeof d.favorite!=='boolean')throw Error('invalid');await db.prepare('UPDATE idle270_events SET favorite=? WHERE public_id=? AND tick=?').bind(d.favorite?1:0,id,d.tick).run();}
   if(changed)row=await save(db,id,row,s,result.p.nextCursor,result.events);
  }
 }
 const s=row?valid(JSON.parse(row.state_json)):null;
 const responses=await Promise.all([synced(play,request,env),synced(work,request,env),synced(life,request,env)]);
 const services=await Promise.all(responses.map(async(r,i)=>({name:['explore','work','life'][i],ok:r.ok,status:r.status,data:await r.json()})));
 const before=Number(new URL(request.url).searchParams.get('before')||Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)throw Error('invalid');
 const events=row?await list(db.prepare('SELECT tick,at_ms,text,favorite FROM idle270_events WHERE public_id=? AND tick<? ORDER BY tick DESC LIMIT 30').bind(id,before)):[];
 return json({ok:true,private:true,now,csrf:session.csrf,step:STEP,cap:CAP,revision:row?.revision??null,cursor:row?.cursor_ms??null,state:s,pending:row?projection(row,now):null,focus:FOCUS,friends:FRIENDS,chapters:s?CHAPTERS.map((c,i)=>({id:i,title:c.title,at:c.at,unlocked:s.ticks>=c.at,...(s.ticks>=c.at?{text:c.text,speaker:c.speaker,choice:c.choice,read:s.read.includes(i),selected:s.choices[i]}:{})})):[],events,services});
 }catch(e){const m=e.message;return json({error:['owner_only','login_required','not_configured','invalid','begin_first','conflict','materials','max_home','already_owned','locked_chapter','choice_saved','save_invalid','clock_conflict'].includes(m)?m:'idle_unavailable'},m==='owner_only'?403:m==='login_required'?401:m==='not_configured'||!['invalid','begin_first','conflict','materials','max_home','already_owned','locked_chapter','choice_saved','clock_conflict'].includes(m)?503:409);}}
