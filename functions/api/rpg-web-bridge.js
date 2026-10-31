import {json,botAuth} from './town-support.js';
export async function onRequest({request,env}){if(!await botAuth(request,env))return json({error:'unauthorized'},401);const db=env.RPG_SUPPORT;if(!db)return json({error:'not_configured'},503);try{
 if(request.method==='GET'){
  // Cancel unprocessed purchases after an account is disabled. Earned rewards remain held for reactivation.
  await db.prepare("UPDATE web_commands SET status='rejected',last_error='account_disabled' WHERE kind='shop' AND status='pending' AND polled_at=0 AND EXISTS(SELECT 1 FROM rpg_accounts a WHERE a.public_id=web_commands.public_id AND a.active=0)").run();
  const result=await db.prepare("SELECT c.id,c.public_id,c.kind,c.p1,c.p2,c.p3,c.p4 FROM web_commands c JOIN rpg_accounts a ON a.public_id=c.public_id WHERE c.status='pending' AND a.active=1 ORDER BY c.polled_at,c.seq LIMIT 20").all();const commands=result.results;
  if(commands.length)await db.batch(commands.map(c=>db.prepare('UPDATE web_commands SET polled_at=? WHERE id=?').bind(Date.now(),c.id)));
  const body=commands.map(c=>[c.id,c.kind,c.public_id,c.p1,c.p2,c.p3,c.p4].join('\t')).join('\n');return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 }
 if(request.method==='POST'){
  if(Number(request.headers.get('Content-Length')||0)>16384)return json({error:'large'},413);const reader=request.body?.getReader();if(!reader)return json({error:'body'},400);let length=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384){await reader.cancel();return json({error:'large'},413);}chunks.push(value);}const bytes=new Uint8Array(length);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}const lines=new TextDecoder().decode(bytes).split('\n').filter(Boolean);if(lines.length>50)return json({error:'large'},413);
  const statements=[];for(const line of lines){const [id,status,reason,...extra]=line.split('\t');if(!/^[a-f0-9]{64}$/.test(id)||!['A','R','H'].includes(status)||extra.length||!/^[a-z_]{0,60}$/.test(reason||''))return json({error:'invalid'},400);statements.push(db.prepare("UPDATE web_commands SET status=?,last_error=? WHERE id=? AND status='pending'").bind(status==='A'?'applied':status==='R'?'rejected':'pending',reason||'',id));}if(statements.length)await db.batch(statements);return json({ok:true});
 }
 return json({error:'method'},405);
}catch{return json({error:'bridge_unavailable'},503);}}
