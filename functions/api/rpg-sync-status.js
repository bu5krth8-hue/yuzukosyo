import {currentSession} from './rpg-account.js';
import {json} from './town-support.js';
export async function onRequest({request,env}){
 if(request.method!=='GET')return json({error:'method'},405);
 try{const db=env.RPG_SUPPORT;if(!db)return json({error:'not_configured'},503);const session=await currentSession(request,db);if(!session)return json({error:'login_required'},401);
 const pending=[];
 for(const [table,kind,label]of [['web_commands','command','購入・探索報酬'],['web_work_claims','work','仕事・お金稼ぎの報酬'],['web_life_claims','life','家族の仕事報酬'],['web_town_contributions','town','住民の依頼への貢献']]){
  const sql=table==='web_commands'?"SELECT CASE WHEN kind='shop' THEN 'shop' ELSE 'reward' END AS kind,COUNT(*) AS count,MIN(created_at) AS since FROM web_commands WHERE public_id=? AND status='pending' GROUP BY CASE WHEN kind='shop' THEN 'shop' ELSE 'reward' END":`SELECT COUNT(*) AS count,MIN(created_at) AS since FROM ${table} WHERE public_id=? AND status='pending'`;
  const rows=(await db.prepare(sql).bind(session.public_id).all()).results;
  for(const r of rows)if(r.count)pending.push({kind:r.kind||kind,label:r.kind==='shop'?'職業・称号の購入／変更':label,count:r.count,since:r.since});
 }
 return json({ok:true,me:session.public_id,pending,now:Date.now()});
 }catch{return json({error:'sync_status_unavailable'},503);}
}
