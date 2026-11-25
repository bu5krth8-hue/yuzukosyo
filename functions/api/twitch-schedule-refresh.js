import { lookahead, readSchedule, twitchToken, twitchUser } from '../_twitch/schedule.js';

function json(data, status = 200) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
}
function authorized(request, secret) {
  const supplied = request.headers.get('Authorization') || '';
  if (typeof secret !== 'string' || secret.length < 32 || supplied.length !== secret.length + 7) return false;
  const expected = 'Bearer ' + secret;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return mismatch === 0;
}

export async function onRequest({request, env}) {
  if (request.method !== 'POST' || !authorized(request, env.TWITCH_SCHEDULE_SYNC_SECRET)) {
    return json({error: 'not_found'}, 404);
  }
  const login = String(env.TWITCH_CHANNEL_LOGIN || 'yuzukosyo07').trim().toLowerCase();
  const client = String(env.TWITCH_CLIENT_ID || '').trim();
  const secret = String(env.TWITCH_CLIENT_SECRET || '').trim();
  if (!env.RPG_SUPPORT || !client || !secret || !/^[a-z0-9_]{1,25}$/.test(login)) return json({error: 'not_configured'}, 503);

  try {
    const now = Date.now();
    const rows = await env.RPG_SUPPORT.prepare(
      "SELECT segment_id FROM twitch_schedule_posts WHERE starts_at > ? AND status <> 'gone' ORDER BY starts_at LIMIT 101"
    ).bind(now).all();
    if (rows.results.length > 100) return json({error: 'tracking_limit'}, 503);
    const token = await twitchToken(client, secret);
    if (!token.ok) return json({error: 'twitch_auth_failed'}, 502);
    const {access_token} = await token.json();
    if (typeof access_token !== 'string' || !access_token) return json({error: 'twitch_auth_failed'}, 502);

    const headers = {'Client-ID': client, Authorization: 'Bearer ' + access_token};
    const userResponse = await twitchUser(headers, login);
    if (!userResponse.ok) return json({error: 'twitch_user_failed'}, 502);
    const user = (await userResponse.json()).data?.[0];
    if (user?.login !== login || !/^\d+$/.test(user.id)) return json({error: 'twitch_user_failed'}, 502);
    const items = await readSchedule(headers, user.id, login, now, rows.results.map(row => row.segment_id));
    // Include currently running segments and keep a small cushion for the site's top-five list.
    const snapshot = JSON.stringify(items.filter(item => !item.canceled && (item.end ?? item.start) > now).slice(0, 25));
    const old = await env.RPG_SUPPORT.prepare('SELECT payload FROM twitch_schedule_snapshot WHERE singleton = 1').first();
    if (old?.payload !== snapshot) {
      await env.RPG_SUPPORT.prepare(
        'INSERT INTO twitch_schedule_snapshot (singleton, payload) VALUES (1, ?) ON CONFLICT(singleton) DO UPDATE SET payload = excluded.payload'
      ).bind(snapshot).run();
    }
    const tracked = new Set(rows.results.map(row => row.segment_id));
    return json({now, items: items.filter(item => tracked.has(item.id) || (item.start > now && item.start < now + lookahead))});
  } catch {
    return json({error: 'schedule_refresh_failed'}, 502);
  }
}
