import {json,session,day,sameOrigin,botAuth} from './town-support.js';
import {readBody} from './rpg-info.js';
export async function onRequest({request,env}){
 const db=env.RPG_SUPPORT;if(!db)return json({error:'storage_not_configured'},503);
 if(request.method==='GET'){
  if(!await botAuth(request,env))return json({error:'unauthorized'},401);
  try{const result=await db.prepare('SELECT request_key AS id,created_at AS createdAt,category,nickname,message FROM rpg_feedback ORDER BY created_at DESC,request_key DESC LIMIT 200').all();return json({ok:true,items:result.results});}catch{return json({error:'storage_unavailable'},503);}
 }
 return json({error:'moved_to_discord',discord:'https://discord.gg/8ZUwSmmccK'},410);
}
