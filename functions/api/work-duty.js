// Legacy rows without a duty row remain active; never reset earned balances.
export const activeWorkSQL="EXISTS(SELECT 1 FROM web_work_state w LEFT JOIN web_work_duty d ON d.public_id=w.public_id WHERE w.public_id=? AND COALESCE(d.active,1)=1)";
export const pendingJobSQL="EXISTS(SELECT 1 FROM web_commands WHERE public_id=? AND kind='shop' AND status='pending' AND p1 NOT IN ('title1','title2','title3','title4','title5','title6'))";
export const working=async(db,id)=>!!await db.prepare('SELECT 1 AS yes WHERE '+activeWorkSQL).bind(id).first();
export async function enqueueJob(db,id,item,cid,now,native=false){
 const old=await db.prepare('SELECT id FROM web_commands WHERE id=? AND public_id=?').bind(cid,id).first();if(old)return old.id;
 const r=await db.prepare("INSERT INTO web_commands(id,public_id,kind,p1,p2,p3,p4,created_at) SELECT ?,?,'shop',?,'','',?,? WHERE NOT "+activeWorkSQL+" AND NOT "+pendingJobSQL+" ON CONFLICT(id) DO NOTHING").bind(cid,id,item,native?'native_shop_v264':'',now,id,id).run();
 if(r.meta.changes!==1){const again=await db.prepare('SELECT id FROM web_commands WHERE id=? AND public_id=?').bind(cid,id).first();if(again)return again.id;throw Error(await working(db,id)?'work_active':'job_pending');}return cid;
}
