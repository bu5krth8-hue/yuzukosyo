import {json} from './town-support.js';
export function validateNewspaper(v){
 const text=(s,n)=>{if(typeof s!=='string'||s.length>n||/[\u0000-\u001f]/.test(s))throw Error('news_text');return s;};
 const date=at=>{if(!Number.isSafeInteger(at)||at<Date.UTC(2020,0,1)||at>Date.now()+300000)throw Error('news_time');return new Date(at+32400000).toISOString().slice(0,10);};
 if(v?.schema!==1||!Array.isArray(v.events)||v.events.length>600)throw Error('news_schema');date(v.startedAt);const ids=new Set();
 const events=v.events.map(e=>{if(!/^[a-f0-9]{64}$/.test(e.id)||ids.has(e.id)||!['boss','rescue','town'].includes(e.kind)||e.day!==date(e.at)||!Array.isArray(e.names)||e.names.length>8)throw Error('news_event');ids.add(e.id);return{id:e.id,kind:e.kind,at:e.at,day:e.day,headline:text(e.headline,160),text:text(e.text,700),names:[...new Set(e.names.map(n=>text(n,80)))]};});
 events.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));return{schema:1,startedAt:v.startedAt,events};
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return json({error:'method'},405);
 if(!env.RPG_TOWN)return json({configured:false,data:null},503);
 try{const snapshot=await env.RPG_TOWN.get('yuzu_rpg_public_v1','json');return json({configured:true,capturedAt:snapshot?.capturedAt||null,data:snapshot?.newspaper||null,nemesis:snapshot?.nemesis||null});}catch{return json({error:'storage_unavailable'},503);}
}
