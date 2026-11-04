import {json,botAuth} from './town-support.js';
import {readBody} from './rpg-info.js';import {hash} from './rpg-account.js';import {enqueueJob,working} from './work-duty.js';import {PLAY} from '../../rpg-play-data.js';
export async function onRequest({request,env}){
 if(request.method!=='POST')return json({error:'method'},405);
 if(!await botAuth(request,env))return json({error:'unauthorized'},401);
 try{if(!env.RPG_SUPPORT||!env.RPG_TOWN)throw Error('not_configured');const d=await readBody(request,1024);
 if(d.action==='check'){
  if(!/^[a-f0-9]{64}$/.test(d.commandId||'')||!/^[a-f0-9]{64}$/.test(d.id||''))throw Error('invalid_request');
  const c=await env.RPG_SUPPORT.prepare("SELECT id,status FROM web_commands WHERE id=? AND public_id=? AND kind='shop'").bind(d.commandId,d.id).first();if(!c||c.status==='rejected')throw Error('command_unavailable');
  if(c.status==='applied')return json({ok:true});
  const a=await env.RPG_SUPPORT.prepare('SELECT active FROM rpg_accounts WHERE public_id=?').bind(d.id).first();if(a&&!a.active)throw Error('account_disabled');
  if(await working(env.RPG_SUPPORT,d.id))throw Error('work_active');return json({ok:true});
 }
 if(!/^[a-f0-9]{64}$/.test(d.id||'')||!(/^[a-zA-Z0-9-]{1,100}$/.test(d.requestId||''))||!PLAY.jobs.some(j=>j.id===d.item)&&d.item!=='random_owned')throw Error('invalid_request');
 const a=await env.RPG_SUPPORT.prepare('SELECT active FROM rpg_accounts WHERE public_id=?').bind(d.id).first();if(a&&!a.active)throw Error('account_disabled');
 const snapshot=await env.RPG_TOWN.get('yuzu_rpg_public_v1','json');if(!snapshot?.players?.some(p=>p.id===d.id))throw Error('sync_required');
 const cid=await hash('native-shop-v264:'+d.id+':'+d.requestId+':'+d.item);await enqueueJob(env.RPG_SUPPORT,d.id,d.item,cid,Date.now(),true);return json({ok:true,id:cid});
 }catch(e){const known=['work_active','job_pending','account_disabled','sync_required','not_configured','invalid_request','command_unavailable'];return json({error:known.includes(e.message)?e.message:'shop_unavailable'},['work_active','job_pending','account_disabled'].includes(e.message)?409:e.message==='invalid_request'?400:503);}
}
