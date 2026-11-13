const SNAPSHOT_KEYS = new Set([
  'yuzu_town_public_v1',
  'yuzu_rpg_public_v1',
  'yuzu_rpg_identity_private_v1',
  'yuzu_rpg_game_private_v1'
]);

export async function snapshotGet(env, key) {
  if (env.snapshotCache) {
    if (!env.snapshotCache.has(key)) env.snapshotCache.set(key, readSnapshot(env, key));
    return env.snapshotCache.get(key);
  }
  return readSnapshot(env, key);
}

async function readSnapshot(env, key) {
  if (!SNAPSHOT_KEYS.has(key)) throw new Error('invalid_snapshot_key');
  if (env.RPG_SUPPORT) {
    try {
      const row = await env.RPG_SUPPORT.prepare('SELECT value FROM web_rpg_snapshot WHERE key=?').bind(key).first();
      if (row) return JSON.parse(row.value);
    } catch (error) {
      if (!String(error.message).includes('no such table: web_rpg_snapshot')) throw error;
    }
  }
  return env.RPG_TOWN.get(key, 'json');
}

export async function storeSnapshot(db, records, capturedAt, events=[]) {
  const anchor = records[0][0];
  const statements = records.map(([key, value]) => db.prepare(
    'INSERT INTO web_rpg_snapshot(key,captured_at,value) SELECT ?,?,? ' +
    'WHERE NOT EXISTS (SELECT 1 FROM web_rpg_snapshot WHERE key=? AND captured_at>?) ' +
    'ON CONFLICT(key) DO UPDATE SET captured_at=excluded.captured_at,value=excluded.value'
  ).bind(key, capturedAt, JSON.stringify(value), anchor, capturedAt));
  const firsts=events.filter(e=>e.firstKill&&e.bossKey).map(({bossKey,at})=>({bossKey,at}));
  if(firsts.length)statements.push(db.prepare(`
    INSERT INTO rpg_boss_memorial(boss_key,first_at)
    SELECT json_extract(value,'$.bossKey'),json_extract(value,'$.at') FROM json_each(?)
    WHERE (SELECT captured_at FROM web_rpg_snapshot WHERE key=?)=?
    ON CONFLICT(boss_key) DO UPDATE SET first_at=MIN(first_at,excluded.first_at)
  `).bind(JSON.stringify(firsts),anchor,capturedAt));
  const result = await db.batch(statements);
  return result[0].meta.changes === 1;
}
