import {hash} from '../api/rpg-account.js';
import {dayAt} from './idle-living.js';
import {valid} from './idle-engine.js';
export const getRow=(db,id)=>db.prepare('SELECT * FROM idle270_state WHERE public_id=?').bind(id).first();
export const rows=async q=>(await q.all()).results;
export async function save(db,id,row,next,cursor,events,d,payloadHash){
 const rev=row.revision+1,op=crypto.randomUUID(),guard='EXISTS(SELECT 1 FROM idle270_state WHERE public_id=? AND revision=? AND last_op=?)',args=[id,rev,op],q=[db.prepare('UPDATE idle270_state SET revision=?,cursor_ms=?,state_json=?,last_op=? WHERE public_id=? AND revision=?').bind(rev,cursor,JSON.stringify(valid(next)),op,id,row.revision)];
 q.push(db.prepare('INSERT INTO idle274_runs(public_id,run_json) SELECT ?,? WHERE '+guard+' ON CONFLICT(public_id) DO UPDATE SET run_json=excluded.run_json').bind(id,JSON.stringify(next.journey),...args));
 q.push(db.prepare('INSERT OR IGNORE INTO idle271_backups(public_id,revision,cursor_ms,state_json,created_at) SELECT ?,?,?,?,? WHERE '+guard).bind(id,row.revision,row.cursor_ms,row.state_json,Date.now(),...args));
 for(const e of events)q.push(db.prepare('INSERT INTO idle270_events(public_id,tick,at_ms,text,detail_json) SELECT ?,?,?,?,? WHERE '+guard).bind(id,e.tick,e.at,e.text,JSON.stringify({kind:e.kind,...e.detail}),...args));
 if(d.action==='favorite')q.push(db.prepare('UPDATE idle270_events SET favorite=? WHERE public_id=? AND tick=? AND '+guard).bind(d.favorite?1:0,id,d.tick,...args));
 if(d.action==='daily_claim')q.push(db.prepare('INSERT INTO idle272_claims(public_id,day_key,kind,created_at) SELECT ?,?,?,? WHERE '+guard).bind(id,dayAt(Date.now()),d.quest,Date.now(),...args));
 for(const e of events)if(e.detail?.celebration)q.push(db.prepare("INSERT INTO idle272_claims(public_id,day_key,kind,created_at) SELECT ?,?,'birthday',? WHERE "+guard).bind(id,e.detail.celebration,e.at,...args));
 if(d.action==='journey_claim'&&next.journey?.processed){const j=next.journey;if(j.mode==='income'){for(let offset=0;offset<j.processed;offset+=16){const n=Math.min(16,j.processed-offset),key=await hash(id+':idle274:'+j.id+':'+offset);q.push(db.prepare('INSERT INTO web_work_claims(id,public_id,request_key,job_id,minutes,exp,coins,created_at) SELECT ?,?,?,?,?,?,?,? WHERE '+guard).bind(key,id,'idle274-'+j.id+'-'+offset,j.job,n*30,Math.floor(n/2),n,Date.now(),...args));}}else if(j.mode==='town'){const key=await hash(id+':town:'+dayAt(Date.now()));q.push(db.prepare('INSERT OR IGNORE INTO web_town_contributions(id,public_id,day_key,created_at) SELECT ?,?,?,? WHERE '+guard).bind(key,id,dayAt(Date.now()),Date.now(),...args));}}
 q.push(db.prepare('INSERT INTO idle271_receipts(public_id,request_id,action,payload_hash,revision,created_at) SELECT ?,?,?,?,?,? WHERE '+guard).bind(id,d.requestId,d.action,payloadHash,rev,Date.now(),...args));
 q.push(db.prepare('DELETE FROM idle271_backups WHERE public_id=? AND revision<? AND '+guard).bind(id,rev-5,...args));
 const r=await db.batch(q);if(r[0].meta.changes!==1)throw Error('conflict');return getRow(db,id);
}
