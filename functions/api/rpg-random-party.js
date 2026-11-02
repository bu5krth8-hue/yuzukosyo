// Passive participation is separate from the player's own exclusive activity slot.
export async function pickSupporters(c,dayKey){
 const result=await c.db.prepare(`SELECT a.public_id FROM rpg_accounts a
 LEFT JOIN web_random_support_settings s ON s.public_id=a.public_id
 WHERE a.active=1 AND a.public_id<>? AND COALESCE(s.enabled,1)=1
 AND (SELECT COUNT(*) FROM web_mission_supporters x WHERE x.public_id=a.public_id AND x.day_key=?)<6`).bind(c.id,dayKey).all();
 const known=new Set(c.snapshot.players.map(p=>p.id)),pool=result.results.map(x=>x.public_id).filter(id=>known.has(id));
 // Rejection sampling avoids modulo bias; no client-supplied participants are trusted.
 for(let i=pool.length-1;i>0;i--){const max=Math.floor(0x100000000/(i+1))*(i+1);let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=max);const j=n%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,3);
}
export function supportInsert(db,mission,id,dayKey,nonce){return db.prepare(`INSERT INTO web_mission_supporters(mission_id,public_id,day_key,day_slot)
 SELECT ?,?,?,CASE WHEN EXISTS(SELECT 1 FROM rpg_accounts WHERE public_id=? AND active=1)
 AND COALESCE((SELECT enabled FROM web_random_support_settings WHERE public_id=?),1)=1 THEN
 (SELECT MIN(slot) FROM (SELECT 1 slot UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) WHERE NOT EXISTS(SELECT 1 FROM web_mission_supporters x WHERE x.public_id=? AND x.day_key=? AND x.day_slot=slot)) ELSE NULL END
 WHERE EXISTS(SELECT 1 FROM web_missions WHERE id=? AND start_nonce=?)
 `).bind(mission,id,dayKey,id,id,id,dayKey,mission,nonce);}
export async function supportState(c,now){
 const dayKey=new Date(now+9*3600000).toISOString().slice(0,10),{db,id}=c;
 const settings=await db.prepare('SELECT enabled FROM web_random_support_settings WHERE public_id=?').bind(id).first();
 const count=await db.prepare('SELECT COUNT(*) n FROM web_mission_supporters WHERE public_id=? AND day_key=?').bind(id,dayKey).first();
 const departures=await db.prepare('SELECT COUNT(*) n FROM web_mission_members WHERE public_id=? AND day_key=?').bind(id,dayKey).first();
 const records=await db.prepare(`SELECT m.id,m.owner,m.kind,m.region,m.status,m.started_at,m.ends_at,m.result_json,m.plan_json FROM web_missions m JOIN web_mission_supporters x ON x.mission_id=m.id WHERE x.public_id=? ORDER BY m.started_at DESC LIMIT 12`).bind(id).all();
 return {supportEnabled:settings?.enabled!==0,supportToday:count.n,departuresToday:departures.n,supportMissions:records.results.map(m=>({...m,result:m.result_json?JSON.parse(m.result_json):null,loadout:JSON.parse(m.plan_json).loadout,result_json:undefined,plan_json:undefined}))};
}
