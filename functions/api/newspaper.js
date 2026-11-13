import {snapshotGet} from './rpg-snapshot.js';
import {json} from './town-support.js';
export function validateNewspaper(v){
 const text=(s,n)=>{if(typeof s!=='string'||s.length>n||/[\u0000-\u001f]/.test(s))throw Error('news_text');return s;};
 const date=at=>{if(!Number.isSafeInteger(at)||at<Date.UTC(2020,0,1)||at>Date.now()+300000)throw Error('news_time');return new Date(at+32400000).toISOString().slice(0,10);};
 if(v?.schema!==1||!Array.isArray(v.events)||v.events.length>600)throw Error('news_schema');date(v.startedAt);const ids=new Set();
 const events=v.events.map(e=>{if(!/^[a-f0-9]{64}$/.test(e.id)||ids.has(e.id)||!['boss','rescue','town','adventure','pvp'].includes(e.kind)||e.day!==date(e.at)||!Array.isArray(e.names)||e.names.length>8)throw Error('news_event');ids.add(e.id);return{id:e.id,kind:e.kind,at:e.at,day:e.day,headline:text(e.headline,160),text:text(e.text,700),names:[...new Set(e.names.map(n=>text(n,80)))],
   ...(/^[a-f0-9]{64}$/.test(e.featured||'') && ['boss','rescue','adventure'].includes(e.kind)?{featured:e.featured}:{}),
   ...(e.kind==='boss' && /^[a-z0-9_]{1,80}$/.test(e.bossKey||'')?{bossKey:e.bossKey,firstKill:e.firstKill===true}:{})};});
 events.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));return{schema:1,startedAt:v.startedAt,events};
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return json({error:'method'},405);
 if(!env.RPG_TOWN)return json({configured:false,data:null},503);
 try{const snapshot=await snapshotGet(env,'yuzu_rpg_public_v1');const data=await withPortraits(env.RPG_SUPPORT,snapshot?.newspaper,snapshot?.players);
 return json({configured:true,capturedAt:snapshot?.capturedAt||null,data,nemesis:snapshot?.nemesis||null});}catch{return json({error:'storage_unavailable'},503);}
}

export async function withPortraits(db,paper,players=[]){
 if(!paper)return null;
 const ids=[...new Set(paper.events.map(e=>e.featured).filter(Boolean))];
 let looks=new Map();
 if(db && ids.length){
   try{
     const {results}=await db.prepare("SELECT c.public_id,c.sprite,c.color,c.accessory FROM web_character c JOIN rpg_accounts a USING(public_id) WHERE a.active=1 AND c.sprite LIKE '%:public' AND c.public_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all();
     looks=new Map(results.map(r=>[r.public_id,{sprite:r.sprite.split(':')[0],color:r.color,accessory:r.accessory}]));
   }catch(error){console.warn('Newspaper portraits unavailable',error.name);}
 }
 const names=new Map(players.map(p=>[p.id,p.name]));
 return {...paper,events:paper.events.map(({featured,...event})=>{
   const look=looks.get(featured);
   const name=names.get(featured);
   return look&&name?{...event,look,featuredName:name}:event;
 })};
}
