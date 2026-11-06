export async function requireNoIdleJourney(db,id){
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='idle274_runs'").first();if(!exists)return;
 const row=await db.prepare('SELECT run_json FROM idle274_runs WHERE public_id=?').bind(id).first();if(row){const run=JSON.parse(row.run_json);if(run&&!run.claimed)throw Error('work_active');}
}
