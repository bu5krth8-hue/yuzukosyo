export const ORIGIN='https://yuzukosyo.pages.dev';
export const COOKIE='__Host-yuzu-town-support';
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
export function cookie(name,value,age){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
export function cookies(request){return Object.fromEntries((request.headers.get('Cookie')||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(p=>p.length>1));}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function bytes(s){return Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function key(env){if(typeof env.RPG_TOWN_TOKEN!=='string'||env.RPG_TOWN_TOKEN.length<32)throw Error('not_configured');return crypto.subtle.importKey('raw',new TextEncoder().encode(env.RPG_TOWN_TOKEN),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function sign(env,data,purpose){const body=b64(new TextEncoder().encode(JSON.stringify(data)));const sig=b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),new TextEncoder().encode(purpose+':'+body))));return body+'.'+sig;}
export async function verify(env,value,purpose){try{if(typeof value!=='string'||value.length>2048)return null;const [body,sig,...extra]=value.split('.');if(extra.length||!body||!sig)return null;if(!await crypto.subtle.verify('HMAC',await key(env),bytes(sig),new TextEncoder().encode(purpose+':'+body)))return null;const data=JSON.parse(new TextDecoder().decode(bytes(body)));if(!Number.isSafeInteger(data.exp)||data.exp<=Date.now())return null;return data;}catch{return null;}}
export function random(){return b64(crypto.getRandomValues(new Uint8Array(24)));}
export async function session(request,env){const s=await verify(env,cookies(request)[COOKIE],'browser-support-v1');return s&&/^[A-Za-z0-9_-]{32}$/.test(s.id)&&typeof s.csrf==='string'?s:null;}
export function day(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function sameOrigin(request){return request.headers.get('Origin')===ORIGIN;}
export async function botAuth(request,env){const s=env.RPG_TOWN_TOKEN;if(typeof s!=='string'||s.length<32)return false;const got=request.headers.get('Authorization')||'';if(got.length>1024)return false;const hash=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));const [a,b]=await Promise.all([hash(got),hash('Bearer '+s)]);let n=0;for(let i=0;i<a.length;i++)n|=a[i]^b[i];return n===0;}
export async function aggregate(db){
 const state=await db.prepare('SELECT epoch, applied, total FROM town_support_rollup WHERE singleton=1').first();
 if(!state||!/^[a-f0-9]{32}$/.test(state.epoch)||!Number.isSafeInteger(state.total)||!Number.isSafeInteger(state.applied)||state.applied<0||state.applied>state.total)throw Error('invalid_state');
 return state;
}

export async function onRequest({request,env}){
 const db=env.RPG_SUPPORT;if(!db)return json({configured:false,error:'support_not_configured'},503);
 const url=new URL(request.url),sync=url.searchParams.has('sync');
 if(sync){
  if(!await botAuth(request,env))return json({error:'unauthorized'},401);
  try{
   const a=await aggregate(db);
   if(request.method==='GET')return new Response('1|'+a.epoch+'|'+a.total+'|'+a.applied,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',
    ...(a.total===a.applied?{'X-Town-Support-Drained':'1'}:{})}});
   if(request.method==='POST'){
    if(Number(request.headers.get('Content-Length')||0)>128)return json({error:'large'},413);
    const reader=request.body?.getReader();if(!reader)return json({error:'invalid'},400);let bytes=0,parts=[];
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>128){await reader.cancel();return json({error:'large'},413);}parts.push(value);}
    const data=new Uint8Array(bytes);let i=0;for(const p of parts){data.set(p,i);i+=p.length;}
    const [v,epoch,raw,previous,...extra]=new TextDecoder().decode(data).split('|'),n=Number(raw);
    if(v!=='1'||epoch!==a.epoch||extra.length||!/^\d+$/.test(raw)||!/^\d+$/.test(previous)||!Number.isSafeInteger(n)||n<0||n>a.total||Number(previous)>n)return json({error:'invalid_ack'},409);
    if(n>a.applied)await db.prepare('UPDATE town_support_meta SET applied=? WHERE singleton=1 AND epoch=? AND applied<?').bind(n,epoch,n).run();
    return json({ok:true});
   }
   return json({error:'method'},405);
  }catch{return json({error:'support_storage_unavailable'},503);}
 }
 if(request.method==='GET')return json({configured:true,retired:true});
 return json({error:'support_retired'},410);
}
