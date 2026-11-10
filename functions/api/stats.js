export async function onRequest(context) {
 const env = context.env || {};
 const kv = env.SITE_STATS;

 const db = env.RPG_SUPPORT;
 if (!kv || !db) {
  return json({
   configured: false,
   total: 0,
   message: "Cloudflare KV binding「SITE_STATS」が未設定です"
  }, 200);
 }

 try {
  if (context.request.method !== 'GET') return json({configured: false}, 405);
  const advance = () => db.prepare('UPDATE web_visit_counter SET total=total+1 WHERE singleton=1 RETURNING total').first();
  let row = await advance();
  if (!row) {
   const current = Number.parseInt(await kv.get('total_access') || '0', 10);
   const seed = Number.isSafeInteger(current) && current >= 0 ? current : 0;
   await db.prepare('INSERT OR IGNORE INTO web_visit_counter(singleton,total) VALUES(1,?)').bind(seed).run();
   row = await advance();
  }

  return json({
   configured: true,
   total: row.total,
   message: "アクセス数を更新しました"
  });
 } catch {
  return json({
   configured: false,
   total: 0,
   message: "アクセス数の更新に失敗しました"
  }, 500);
 }
}

function json(data, status = 200) {
 return new Response(JSON.stringify(data), {
  status,
  headers: {
   "Content-Type": "application/json; charset=utf-8",
   "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
   "Pragma": "no-cache",
   "Expires": "0"
  }
 });
}
