import {json} from './town-support.js';
import {gameContext} from './rpg-play.js';
import {hash} from './rpg-account.js';
import {readBody} from './rpg-info.js';
import {WORK_JOBS,workLevel,workProjection} from '../../work-data.js';
const list=async q=>(await q.all()).results;
async function state(c,operation=null){const work=await c.db.prepare('SELECT * FROM web_work_state WHERE public_id=?').bind(c.id).first(),levels=await list(c.db.prepare('SELECT job_id,xp FROM web_work_levels WHERE public_id=?').bind(c.id)),claims=await list(c.db.prepare('SELECT id,job_id,minutes,exp,coins,status,created_at,last_error FROM web_work_claims WHERE public_id=? ORDER BY created_at DESC,id DESC LIMIT 12').bind(c.id)),privateData=await c.env.RPG_TOWN.get('yuzu_rpg_game_private_v1','json'),owned=privateData?.capturedAt===c.snapshot.capturedAt?privateData.players.find(p=>p.id===c.id):null;const jobs=WORK_JOBS.map(j=>{const xp=levels.find(x=>x.job_id===j.id)?.xp||0;return {...j,xp,level:workLevel(xp),owned:j.price===0||!!owned?.ownedJobs?.includes(j.id)};});return {ok:true,me:c.id,now:Date.now(),work:work?{jobId:work.job_id,cursorMs:work.cursor_ms,revision:work.revision,projection:workProjection(work,levels.find(x=>x.job_id===work.job_id)?.xp||0,Date.now())}:null,jobs,claims,operation};}
export async function onRequest({request,env}){if(!['GET','POST'].includes(request.method))return json({error:'method'},405);try{
 const c=await gameContext(request,env,request.method==='POST');if(request.method==='GET')return json(await state(c));
 const d=await readBody(request,1024);if(!['select','claim'].includes(d.action)||typeof d.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.requestId))throw Error('invalid_request');
 const op=await hash('yuzu-work-v1:'+c.id+':'+d.requestId),done=await c.db.prepare('SELECT id FROM web_work_operations WHERE id=? AND public_id=?').bind(op,c.id).first();if(done)return json(await state(c,op));
 const now=Date.now(),old=await c.db.prepare('SELECT * FROM web_work_state WHERE public_id=?').bind(c.id).first();let target=old?.job_id;
 if(d.action==='select'){const j=WORK_JOBS.find(x=>x.id===d.jobId);if(!j)throw Error('invalid_job');const privateData=await env.RPG_TOWN.get('yuzu_rpg_game_private_v1','json');if(privateData?.capturedAt!==c.snapshot.capturedAt)throw Error('sync_required');const own=privateData.players.find(p=>p.id===c.id);if(j.price>0&&!own?.ownedJobs?.includes(j.id))throw Error('job_locked');target=j.id;if(old?.job_id===target)throw Error('same_job');}
 if(!old&&d.action==='claim')throw Error('not_working');if(old&&now<old.cursor_ms)throw Error('clock_conflict');
 let projection=null;if(old){const level=await c.db.prepare('SELECT xp FROM web_work_levels WHERE public_id=? AND job_id=?').bind(c.id,old.job_id).first();projection=workProjection(old,level?.xp||0,now);if(d.action==='claim'&&projection.minutes===0)throw Error('not_ready');}
 const revision=(old?.revision??-1)+1,guard='EXISTS(SELECT 1 FROM web_work_state WHERE public_id=? AND last_op=? AND revision=?)',statements=[];
 if(!old)statements.push(c.db.prepare('INSERT INTO web_work_state(public_id,job_id,cursor_ms,last_op) VALUES(?,?,?,?) ON CONFLICT(public_id) DO NOTHING').bind(c.id,target,now,op));
 else statements.push(c.db.prepare('UPDATE web_work_state SET job_id=?,cursor_ms=?,revision=revision+1,exp_remainder=?,coin_remainder=?,last_op=? WHERE public_id=? AND revision=?').bind(target,projection.nextCursor,projection.expRemainder,projection.coinRemainder,op,c.id,old.revision));
 statements.push(c.db.prepare('INSERT INTO web_work_operations(id,public_id,created_at) SELECT ?,?,? WHERE '+guard).bind(op,c.id,now,c.id,op,revision));
 if(projection?.minutes>0){
  statements.push(c.db.prepare('INSERT INTO web_work_levels(public_id,job_id,xp) SELECT ?,?,? WHERE '+guard+' ON CONFLICT(public_id,job_id) DO UPDATE SET xp=xp+excluded.xp').bind(c.id,old.job_id,projection.minutes,c.id,op,revision));
  statements.push(c.db.prepare('INSERT INTO web_work_claims(id,public_id,request_key,job_id,minutes,exp,coins,created_at) SELECT ?,?,?,?,?,?,?,? WHERE '+guard).bind(op,c.id,d.requestId,old.job_id,projection.minutes,projection.exp,projection.coins,now,c.id,op,revision));
 }
 const result=await c.db.batch(statements);if(result[0].meta.changes!==1)throw Error('operation_conflict');return json(await state(c,op));
 }catch(e){const m=e.message,known=['login_required','csrf','sync_required','not_configured','invalid_request','invalid_job','job_locked','same_job','not_working','not_ready','clock_conflict','operation_conflict'];return json({error:known.includes(m)?m:'work_unavailable'},m==='login_required'?401:m==='csrf'?403:['sync_required','not_configured'].includes(m)||!known.includes(m)?503:409);}}
