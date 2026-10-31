import {json,session,day,sameOrigin,botAuth} from './town-support.js';
import {readBody} from './rpg-info.js';
export async function onRequest({request,env}){
 const db=env.RPG_SUPPORT;if(!db)return json({error:'storage_not_configured'},503);
 if(request.method==='GET'){
  if(!await botAuth(request,env))return json({error:'unauthorized'},401);
  try{const result=await db.prepare('SELECT request_key AS id,created_at AS createdAt,category,nickname,message FROM rpg_feedback ORDER BY created_at DESC,request_key DESC LIMIT 200').all();return json({ok:true,items:result.results});}catch{return json({error:'storage_unavailable'},503);}
 }
 if(request.method!=='POST')return json({error:'method'},405);
 if(!sameOrigin(request))return json({error:'origin'},403);
 const user=await session(request,env);if(!user)return json({error:'cookie_required'},401);
 if(request.headers.get('X-Town-CSRF')!==user.csrf)return json({error:'csrf'},403);
 try{
  const d=await readBody(request,8192),id=request.headers.get('X-Town-Request')||'',today=day();
  if(!/^[A-Za-z0-9_-]{16,80}$/.test(id)||!['要望','不具合','感想'].includes(d.category)||typeof d.message!=='string'||!d.message.trim()||d.message.length>1000||typeof d.nickname!=='string'||d.nickname.length>40||d.website) return json({error:'invalid'},400);
  await db.prepare('INSERT INTO rpg_feedback(request_key,day_key,browser_id,created_at,category,nickname,message) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM rpg_feedback WHERE day_key=? AND browser_id=?)<3 ON CONFLICT DO NOTHING').bind(id,today,user.id,new Date().toISOString(),d.category,d.nickname.trim(),d.message.trim(),today,user.id).run();
  const accepted=await db.prepare('SELECT request_key FROM rpg_feedback WHERE request_key=? AND browser_id=?').bind(id,user.id).first();
  return json(accepted?{ok:true}:{error:'daily_limit'},accepted?200:429);
 }catch{return json({error:'storage_unavailable'},503);}
}
