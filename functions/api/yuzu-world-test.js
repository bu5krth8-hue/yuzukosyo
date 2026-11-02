import {json,sameOrigin,cookies} from './town-support.js';
import {randomToken,hash} from './rpg-account.js';
import {readBody} from './rpg-info.js';
import {ownerSession,requireGate,statusFor,gateCookie,GATE,GATE_AGE} from '../_world/access.js';
import {PASSWORD_SALT,PASSWORD_HASH} from '../_world/config.js';
export async function onRequest({request,env}){try{
 const session=await ownerSession(request,env),db=env.RPG_SUPPORT;
 if(request.method==='GET'){let unlocked=false;try{await requireGate(request,env);unlocked=true;}catch{}return json({ok:true,unlocked,csrf:session.csrf});}
 if(request.method!=='POST')return json({error:'method'},405);
 if(!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf)return json({error:'csrf'},403);
 const d=await readBody(request,1024),now=Date.now();
 if(d.action==='lock'){const token=cookies(request)[GATE];if(token)await db.prepare('DELETE FROM world252_gate WHERE token_hash=? AND public_id=?').bind(await hash('world-gate:'+token),session.public_id).run();const r=json({ok:true});r.headers.set('Set-Cookie',gateCookie('',0));return r;}
 if(d.action!=='unlock'||typeof d.password!=='string'||d.password.length>120)throw Error('invalid');
 const key='password:'+session.public_id+':'+Math.floor(now/900000);
 await db.prepare('INSERT INTO world252_limits(bucket_key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(bucket_key) DO UPDATE SET hits=hits+1').bind(key,now+1800000).run();
 const limit=await db.prepare('SELECT hits FROM world252_limits WHERE bucket_key=?').bind(key).first();if(limit.hits>10)throw Error('rate_limit');
 const digest=await hash(PASSWORD_SALT+':'+d.password);let different=0;for(let i=0;i<64;i++)different|=digest.charCodeAt(i)^PASSWORD_HASH.charCodeAt(i);if(different)return json({error:'wrong_password'},403);
 const token=randomToken();await db.batch([db.prepare('DELETE FROM world252_gate WHERE expires_at<=?').bind(now),db.prepare('DELETE FROM world252_limits WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO world252_gate(token_hash,public_id,account_session_hash,expires_at) VALUES(?,?,?,?)').bind(await hash('world-gate:'+token),session.public_id,session.token_hash,Math.min(session.expires_at,now+GATE_AGE*1000))]);
 const response=json({ok:true});response.headers.set('Set-Cookie',gateCookie(token));return response;
 }catch(e){const known=['login_required','test_password_required','owner_only','rate_limit','invalid','not_configured'];return json({error:known.includes(e.message)?e.message:'unavailable'},statusFor(e));}}
