import {PLAY} from '../../rpg-play-data.js';
export async function chooseEcho(c,excluded,dayKey){
 if(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296>=0.35)return null;
 const q=await c.db.prepare(`SELECT a.public_id FROM rpg_accounts a LEFT JOIN web_echo_settings s ON s.public_id=a.public_id
 WHERE a.active=1 AND COALESCE(s.enabled,1)=1 AND
 (SELECT COUNT(*) FROM web_travel_echo e WHERE e.helper=a.public_id AND e.day_key=?)<3
 AND a.public_id<>COALESCE((SELECT helper FROM web_travel_echo WHERE owner=? ORDER BY created_at DESC,mission_id DESC LIMIT 1),'')
 ORDER BY (SELECT COUNT(*) FROM web_travel_echo e WHERE e.helper=a.public_id AND e.created_at>?),random()`).bind(dayKey,c.id,Date.now()-7*86400000).all();
 const blocked=new Set(excluded);return q.results.map(x=>x.public_id).find(id=>!blocked.has(id)&&c.snapshot.players.some(p=>p.id===id))||null;
}
export function echoStory(jobId,repeat){
 const cat=PLAY.jobs.find(j=>j.id===jobId)?.category;
 const text=({'剣技・重装':'魔物を追い払い、安全な道を切り開いてくれました。','元素魔法':'魔法の明かりで、進むべき道を照らしてくれました。','影・武術':'隠れた近道を教えてくれました。','聖務・守護':'傷を癒やし、旅の続きへ送り出してくれました。','槍弓・射撃':'高台から危険を見つけ、安全な道へ案内してくれました。','芸能・旅':'旅の知恵と物資を分けてくれました。','工芸・学術':'地図と道具を整えて、探索を助けてくれました。','精霊・召喚':'精霊とともに、迷いやすい道を案内してくれました。'})[cat]||'道を教え、探索を助けてくれました。';
 return (repeat>1?'「また会ったね。今回も気を付けて」 ':'「この先も、よい旅を」 ')+text;
}
export function echoInsert(c,mission,nonce,helper,job,region,dayKey){
 const known=id=>c.snapshot.players.find(p=>p.id===id)?.name||'冒険者';
 return c.db.prepare(`INSERT INTO web_travel_echo(mission_id,owner,helper,owner_name,helper_name,job,region,day_key,slot,bonus,story,meetings,created_at)
 SELECT ?,?,?,?,?,?,?,?,(SELECT MIN(slot) FROM (SELECT 1 slot UNION ALL SELECT 2 UNION ALL SELECT 3) options WHERE NOT EXISTS(SELECT 1 FROM web_travel_echo x WHERE helper=? AND day_key=? AND x.slot=options.slot)),5,?,(SELECT COUNT(*)+1 FROM web_travel_echo WHERE owner=? AND helper=?),?
 WHERE EXISTS(SELECT 1 FROM web_missions WHERE id=? AND start_nonce=?) AND EXISTS(SELECT 1 FROM rpg_accounts WHERE public_id=? AND active=1)
 AND COALESCE((SELECT enabled FROM web_echo_settings WHERE public_id=?),1)=1
 AND (SELECT COUNT(*) FROM web_travel_echo WHERE helper=? AND day_key=?)<3`).bind(mission,c.id,helper,known(c.id),known(helper),job,region,dayKey,helper,dayKey,echoStory(job,1),c.id,helper,Date.now(),mission,nonce,helper,helper,helper,dayKey);
}
export async function echoState(c){
 const setting=await c.db.prepare('SELECT enabled FROM web_echo_settings WHERE public_id=?').bind(c.id).first();
 const letters=await c.db.prepare(`SELECT e.* FROM web_travel_echo e JOIN web_missions m ON m.id=e.mission_id WHERE (e.owner=? OR e.helper=?) AND m.status='claimed' AND e.completed_at IS NOT NULL ORDER BY e.completed_at DESC,e.mission_id DESC LIMIT 30`).bind(c.id,c.id).all();
 return {echoEnabled:setting?.enabled!==0,echoLetters:letters.results.map(e=>({missionId:e.mission_id,role:e.helper===c.id?'helper':'traveler',name:e.helper===c.id?e.owner_name:e.helper_name,job:e.job,region:e.region,story:echoStory(e.job,e.meetings),at:e.completed_at,meetings:e.meetings,exp:e.helper===c.id?1:0,coin:e.helper===c.id?2:0}))};
}
