import {json,cookie,cookies,sameOrigin,botAuth} from './town-support.js';
import {readBody} from './rpg-info.js';
const COOKIE='__Host-yuzu-rpg-session',AGE=604800,KEY='yuzu_rpg_public_v1';
export function randomToken(){const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export async function hash(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');}
const validToken=t=>typeof t==='string'&&/^[A-Za-z0-9_-]{43}$/.test(t);
function response(data,status=200,sessionValue){const r=json(data,status);if(sessionValue!==undefined)r.headers.set('Set-Cookie',cookie(COOKIE,sessionValue,sessionValue?AGE:0));return r;}
export async function currentSession(request,db){const token=cookies(request)[COOKIE];if(!validToken(token))return null;return db.prepare('SELECT s.token_hash,s.public_id,s.csrf,s.expires_at FROM rpg_account_sessions s JOIN rpg_accounts a ON a.public_id=s.public_id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1 AND a.version=s.version').bind(await hash('session:'+token),Date.now()).first();}
export async function onRequest({request,env}){
 const db=env.RPG_SUPPORT;if(!db||!env.RPG_TOWN)return json({error:'not_configured'},503);
 const action=new URL(request.url).searchParams.get('action')||'me';
 try{
  if(action==='me'&&request.method==='GET'){
   const s=await currentSession(request,db);if(!s)return response({authenticated:false},200,'');
   const data=await env.RPG_TOWN.get(KEY,'json'),profile=data?.players?.find(p=>p.id===s.public_id)||null;
   return response({authenticated:true,csrf:s.csrf,expiresAt:s.expires_at,profile,capturedAt:data?.capturedAt||null});
  }
  if(request.method!=='POST')return json({error:'method'},405);
  if(!sameOrigin(request))return json({error:'origin'},403);
  if(action==='login'){
   // Cloudflare supplies this header. Keep only a keyed hash of it in short-lived rate buckets.
   const ip=request.headers.get('CF-Connecting-IP'),secret=env.RPG_ACCOUNT_ADMIN_TOKEN;
   if(!ip||typeof secret!=='string'||secret.length<32)return json({error:'login_not_configured'},503);
   const now=Date.now(),bucket=Math.floor(now/900000),key=await hash(secret+':login-rate:'+ip+':'+bucket);
   await db.prepare('DELETE FROM rpg_login_limits WHERE expires_at<?').bind(now).run();
   const quota=await db.prepare('INSERT INTO rpg_login_limits(bucket_key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET attempts=attempts+1 WHERE attempts<20 RETURNING attempts').bind(key,(bucket+2)*900000).first();
   if(!quota)return json({error:'too_many_attempts'},429);
   const d=await readBody(request,1024),pass=typeof d.pass==='string'?d.pass.trim():'';
   if(!validToken(pass))return json({error:'invalid_login'},401);
   const a=await db.prepare('SELECT public_id,version FROM rpg_accounts WHERE pass_hash=? AND active=1').bind(await hash('pass:'+pass)).first();
   if(!a)return json({error:'invalid_login'},401);
   const token=randomToken(),csrf=randomToken(),old=cookies(request)[COOKIE],expires=now+AGE*1000;
   const statements=[];if(validToken(old))statements.push(db.prepare('DELETE FROM rpg_account_sessions WHERE token_hash=?').bind(await hash('session:'+old)));
   statements.push(db.prepare('INSERT INTO rpg_account_sessions(token_hash,public_id,version,csrf,expires_at) SELECT ?,public_id,version,?,? FROM rpg_accounts WHERE public_id=? AND active=1 AND version=?').bind(await hash('session:'+token),csrf,expires,a.public_id,a.version));
   statements.push(db.prepare('DELETE FROM rpg_account_sessions WHERE expires_at<?').bind(now));
   const result=await db.batch(statements),insert=result[statements.length-2];if(insert.meta.changes!==1)return json({error:'invalid_login'},401);
   return response({ok:true},200,token);
  }
  if(action==='logout'){
   const s=await currentSession(request,db);if(s&&request.headers.get('X-RPG-CSRF')!==s.csrf)return json({error:'csrf'},403);
   if(s)await db.prepare('DELETE FROM rpg_account_sessions WHERE token_hash=?').bind(s.token_hash).run();return response({ok:true},200,'');
  }
  return json({error:'action'},400);
 }catch{return json({error:'account_storage_unavailable'},503);}
}
// Separate authority from the Streamer.bot public-snapshot token.
export async function adminAuth(request,env){return botAuth(request,{RPG_TOWN_TOKEN:env.RPG_ACCOUNT_ADMIN_TOKEN});}
