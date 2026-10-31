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
export async function aggregate(db){const meta=await db.prepare('SELECT epoch, applied FROM town_support_meta WHERE singleton=1').first();const all=await db.prepare('SELECT COUNT(*) AS total, COALESCE(MAX(id),0) AS last FROM town_support_v2').first();if(!meta||!/^[a-f0-9]{32}$/.test(meta.epoch)||!Number.isSafeInteger(all.total)||all.total<0||!Number.isSafeInteger(meta.applied)||meta.applied<0||all.total!==all.last||meta.applied>all.total)throw Error('invalid_state');return {...meta,total:all.total};}

export async function onRequest({request,env}){
 const db=env.RPG_SUPPORT;if(!db)return json({configured:false,error:'support_not_configured'},503);
 const url=new URL(request.url),sync=url.searchParams.has('sync');
 if(sync){
  if(!await botAuth(request,env))return json({error:'unauthorized'},401);
  try{
   const a=await aggregate(db);
   if(request.method==='GET')return new Response('1|'+a.epoch+'|'+a.total+'|'+a.applied,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
   if(request.method==='POST'){
    if(Number(request.headers.get('Content-Length')||0)>128)return json({error:'large'},413);
    const reader=request.body?.getReader();if(!reader)return json({error:'invalid'},400);let bytes=0,parts=[];
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>128){await reader.cancel();return json({error:'large'},413);}parts.push(value);}
    const data=new Uint8Array(bytes);let i=0;for(const p of parts){data.set(p,i);i+=p.length;}
    const [v,epoch,raw,previous,...extra]=new TextDecoder().decode(data).split('|'),n=Number(raw);
    if(v!=='1'||epoch!==a.epoch||extra.length||!/^\d+$/.test(raw)||!/^\d+$/.test(previous)||!Number.isSafeInteger(n)||n<0||n>a.total||Number(previous)>n)return json({error:'invalid_ack'},409);
    await db.prepare('UPDATE town_support_meta SET applied=MAX(applied,?) WHERE singleton=1 AND epoch=?').bind(n,epoch).run();return json({ok:true});
   }
   return json({error:'method'},405);
  }catch{return json({error:'support_storage_unavailable'},503);}
 }
 if(request.method!=='GET'&&request.method!=='POST')return json({error:'method'},405);
 if(typeof env.RPG_TOWN_TOKEN!=='string'||env.RPG_TOWN_TOKEN.length<32)return json({configured:false,error:'secret_not_configured'},503);
 let user=await session(request,env);const today=day();let newCookie;
 if(!user && request.method==='GET'){
  user={id:random(),csrf:random(),exp:Date.now()+31536000000};
  newCookie=cookie(COOKIE,await sign(env,user,'browser-support-v1'),31536000);
 }
 try{
  if(request.method==='POST'){
   if(!sameOrigin(request))return json({error:'origin'},403);
   if(!user)return json({error:'cookie_required'},401);
   if(request.headers.get('X-Town-CSRF')!==user.csrf)return json({error:'csrf'},403);
   const requestId=request.headers.get('X-Town-Request')||'';
   if(!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))return json({error:'request_id'},400);
   // The quota check, slot allocation and insertion are one atomic SQL statement.
   // A retried HTTP request retains its request ID and never consumes another slot.
   await db.prepare('INSERT INTO town_support_v2(id,day_key,browser_id,slot,request_key) SELECT (SELECT COALESCE(MAX(id),0)+1 FROM town_support_v2),?,?,(SELECT COALESCE(MAX(slot),0)+1 FROM town_support_v2 WHERE day_key=? AND browser_id=?),? WHERE (SELECT COUNT(*) FROM town_support_v2 WHERE day_key=? AND browser_id=?)<10 ON CONFLICT DO NOTHING').bind(today,user.id,today,user.id,requestId,today,user.id).run();
  }
  const all=await aggregate(db),count=await db.prepare('SELECT COUNT(*) AS n FROM town_support_v2 WHERE day_key=?').bind(today).first();
  const mine=await db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN id<=? THEN 1 ELSE 0 END),0) AS applied FROM town_support_v2 WHERE day_key=? AND browser_id=?').bind(all.applied,today,user.id).first();
  const requestId=request.headers.get('X-Town-Request')||'';
  const seen=/^[A-Za-z0-9_-]{16,80}$/.test(requestId)?await db.prepare('SELECT id FROM town_support_v2 WHERE day_key=? AND browser_id=? AND request_key=?').bind(today,user.id,requestId).first():null;
  const response=json({configured:true,day:today,today:count.n,total:all.total,applied:all.applied,pending:all.total-all.applied,mineCount:mine.n,mineApplied:mine.applied,minePending:mine.n-mine.applied,remaining:Math.max(0,10-mine.n),dailyLimit:10,requestSeen:!!seen,xpPerSupport:1,csrf:user.csrf});
  if(newCookie)response.headers.append('Set-Cookie',newCookie);return response;
 }catch{return json({configured:false,error:'support_storage_unavailable'},503);}
}
