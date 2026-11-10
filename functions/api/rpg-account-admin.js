import {snapshotGet} from './rpg-snapshot.js';
import {json,sameOrigin} from './town-support.js';
import {readBody} from './rpg-info.js';
import {adminAuth,randomToken,hash} from './rpg-account.js';
const KEY='yuzu_rpg_public_v1';
export async function onRequest({request,env}){
 if(!await adminAuth(request,env))return json({error:'unauthorized'},401);
 const db=env.RPG_SUPPORT;if(!db||!env.RPG_TOWN)return json({error:'not_configured'},503);
 try{
  const snapshot=await snapshotGet(env,KEY);if(!snapshot)return json({error:'snapshot_required'},409);
  const players=snapshot.players,identityData=await snapshotGet(env,'yuzu_rpg_identity_private_v1');
  const identities=new Map((identityData?.capturedAt===snapshot.capturedAt?identityData.identities:[]).map(p=>[p.id,p.login]));
  if(request.method==='GET'){
   const rows=await db.prepare('SELECT public_id,active,version,created_at,updated_at FROM rpg_accounts').all();const map=new Map(rows.results.map(r=>[r.public_id,r]));
   return json({ok:true,players:players.map(p=>({id:p.id,name:p.name,level:p.level,job:p.job,login:identities.get(p.id)||'',issued:map.has(p.id),version:map.get(p.id)?.version||0,active:map.has(p.id)?map.get(p.id).active===1:false,updatedAt:map.get(p.id)?.updated_at||null})),orphaned:rows.results.filter(r=>!players.some(p=>p.id===r.public_id)).map(r=>({id:r.public_id,active:r.active===1,version:r.version}))});
  }
  if(request.method!=='POST')return json({error:'method'},405);
  if(!sameOrigin(request))return json({error:'origin'},403);
  const d=await readBody(request,2048),now=new Date().toISOString();
  if(d.action==='issue_missing'){
   if(!identities.size)return json({error:'identity_sync_required'},409);
   const existing=await db.prepare('SELECT public_id FROM rpg_accounts').all(),ids=new Set(existing.results.map(r=>r.public_id)),targets=players.filter(p=>!ids.has(p.id)&&identities.has(p.id)).slice(0,20);
   const generated=await Promise.all(targets.map(async p=>{const pass=randomToken();return {id:p.id,name:p.name,login:identities.get(p.id),pass,passHash:await hash('pass:'+pass)};}));
   if(!generated.length)return json({ok:true,credentials:[]});
   const result=await db.batch(generated.map(p=>db.prepare('INSERT INTO rpg_accounts(public_id,pass_hash,active,version,created_at,updated_at) VALUES(?,?,1,1,?,?) ON CONFLICT(public_id) DO NOTHING').bind(p.id,p.passHash,now,now)));
   return json({ok:true,credentials:generated.filter((p,i)=>result[i].meta.changes===1).map(({id,name,login,pass})=>({id,name,login,pass}))});
  }
  if(typeof d.id!=='string'||!/^[a-f0-9]{64}$/.test(d.id))return json({error:'invalid'},400);
  const p=players.find(p=>p.id===d.id);
  if(d.action!=='issue'&&(!Number.isSafeInteger(d.version)||d.version<1))return json({error:'version_required'},409);
  if(d.action==='issue'||d.action==='rotate'){
   if(!p)return json({error:'unknown_player'},404);if(!identities.has(d.id))return json({error:'identity_sync_required'},409);
   const pass=randomToken(),passHash=await hash('pass:'+pass);let r;
   if(d.action==='issue')r=await db.prepare('INSERT INTO rpg_accounts(public_id,pass_hash,active,version,created_at,updated_at) VALUES(?,?,1,1,?,?) ON CONFLICT(public_id) DO NOTHING').bind(d.id,passHash,now,now).run();
   else r=await db.prepare('UPDATE rpg_accounts SET pass_hash=?,version=version+1,updated_at=? WHERE public_id=? AND version=?').bind(passHash,now,d.id,d.version).run();
   if(r.meta.changes!==1)return json({error:d.action==='issue'?'already_issued':'account_changed'},409);
   return json({ok:true,credentials:[{id:p.id,name:p.name,login:identities.get(p.id),pass}]});
  }
  const operations={logout_all:'UPDATE rpg_accounts SET version=version+1,updated_at=? WHERE public_id=? AND version=?',disable:'UPDATE rpg_accounts SET active=0,version=version+1,updated_at=? WHERE public_id=? AND version=?',enable:'UPDATE rpg_accounts SET active=1,version=version+1,updated_at=? WHERE public_id=? AND version=?'};
  if(!Object.hasOwn(operations,d.action))return json({error:'action'},400);
  const r=await db.prepare(operations[d.action]).bind(now,d.id,d.version).run();return json(r.meta.changes===1?{ok:true}:{error:'account_changed'},r.meta.changes===1?200:409);
 }catch{return json({error:'account_storage_unavailable'},503);}
}
