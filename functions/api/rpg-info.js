import {json,botAuth} from './town-support.js';
const KEY='yuzu_rpg_public_v1',MAX=2000000;
const num=(v,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(v)||v<0||v>max)throw Error('number');return v;};
const str=(v,max)=>{if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('text');return v;};
export function validate(d){
 if(d?.schema!==1)throw Error('schema');const t=Date.parse(d.capturedAt);if(!Number.isFinite(t)||t<Date.UTC(2020,0,1)||t>Date.now()+300000)throw Error('timestamp');
 if(!Array.isArray(d.players)||d.players.length>3000)throw Error('players');const ids=new Set();
 const players=d.players.map(p=>{const id=str(p.id,64);if(!/^[a-f0-9]{64}$/.test(id)||ids.has(id))throw Error('id');ids.add(id);
  const r={id,name:str(p.name,100),title:str(p.title,100),job:str(p.job,100),jobStats:str(p.jobStats,200)};
  for(const k of ['exp','coin','bossKills','bossDamage','mvp','lastHit','wins','losses','draws','adventures','returns','adventureKills','rescues'])r[k]=num(p[k]);
  let level=1,spent=0;while(level<100&&r.exp>=spent+80+20*(level-1)){spent+=80+20*(level-1);level++;}r.level=level;
  r.attack=level>=100?8:level>=75?7:level>=50?6:level>=30?5:level>=20?4:level>=10?3:level>=5?2:1;r.rank=level>=100?'伝説':level>=75?'勇者':level>=50?'英雄':level>=25?'熟練冒険者':level>=10?'冒険者':'新人';return r;
 });
 const array=(v,n,fn)=>{if(!Array.isArray(v)||v.length!==n)throw Error('array');return v.map(fn);};
 const bool=v=>{if(typeof v!=='boolean')throw Error('boolean');return v;};
 const world={exploration:array(d.world?.exploration,120,v=>num(v,100)),cleared:array(d.world?.cleared,120,bool),open:array(d.world?.open,120,bool),seen:array(d.world?.seen,1000,bool),kills:array(d.world?.kills,1000,v=>num(v))};
 if(world.cleared.some((c,i)=>c&&world.exploration[i]!==100)||world.kills.some((k,i)=>k>0&&!world.seen[i]))throw Error('world');
 return {schema:1,capturedAt:new Date(t).toISOString(),players,world,bossKills:array(d.bossKills,500,v=>num(v))};
}
export async function readBody(request,max=MAX){if(Number(request.headers.get('Content-Length')||0)>max)throw Error('large');const reader=request.body?.getReader();if(!reader)throw Error('body');let length=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw Error('large');}chunks.push(value);}const bytes=new Uint8Array(length);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export async function onRequest({request,env}){
 if(!env.RPG_TOWN)return json({configured:false,error:'storage_not_configured'},503);
 if(request.method==='GET'){try{const d=await env.RPG_TOWN.get(KEY,'json');return json({configured:true,data:d});}catch{return json({error:'storage_unavailable'},503);}}
 if(request.method!=='POST')return json({error:'method'},405);
 if(!await botAuth(request,env))return json({error:'unauthorized'},401);
 try{const d=validate(await readBody(request));const old=await env.RPG_TOWN.get(KEY,'json');if(old&&Date.parse(old.capturedAt)>Date.parse(d.capturedAt))return json({error:'older_snapshot'},409);await env.RPG_TOWN.put(KEY,JSON.stringify(d));return json({ok:true});}
 catch(e){return json({error:e.message==='large'?'too_large':'invalid_or_unavailable'},e.message==='large'?413:503);}
}
