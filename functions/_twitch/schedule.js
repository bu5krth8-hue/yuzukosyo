export const lookahead = 14 * 86400_000;
export const snapshotHeartbeat = 40 * 60_000;
const snapshotMaxAge = 65 * 60_000;
const tai = 'https://api.twitch.tv/helix/schedule';
const day = 86400_000;

export function twitchToken(clientId, clientSecret) {
  return fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials'}),
  });
}

export function twitchUser(headers, login) {
  const url = 'https://api.twitch.tv/helix/users?login=' + encodeURIComponent(login);
  return fetch(url, {headers, redirect: 'manual', signal: AbortSignal.timeout(8000)});
}

export function normalize(segment, vacation) {
  const start = Date.parse(segment?.start_time);
  const end = segment?.end_time == null ? null : Date.parse(segment.end_time);
  if (typeof segment?.id !== 'string' || !segment.id || segment.id.length > 512 ||
      !Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || end <= start))) {
    throw new Error('invalid_segment');
  }
  return {
    id: segment.id, start, end,
    title: typeof segment.title === 'string' ? segment.title.trim().slice(0, 500) || '配信予定' : '配信予定',
    category: typeof segment.category?.name === 'string' ? segment.category.name.trim().slice(0, 200) || 'カテゴリ未設定' : 'カテゴリ未設定',
    canceled: Boolean(segment.canceled_until) || Boolean(vacation && start >= vacation[0] && start < vacation[1]),
  };
}

export async function readSchedule(headers, broadcasterId, login, now, trackedIds = []) {
  const get = async (params, mayBeEmpty) => {
    params.set('broadcaster_id', broadcasterId);
    const response = await fetch(tai + '?' + params, {headers, redirect: 'manual', signal: AbortSignal.timeout(8000)});
    if (response.status === 404 && mayBeEmpty) {
      const problem = await response.json();
      if (problem.status === 404 && problem.error === 'Not Found') return {items: [], cursor: ''};
    }
    if (!response.ok) throw new Error('schedule_request_failed');
    const {data, pagination} = await response.json();
    if (data?.broadcaster_id !== broadcasterId || data.broadcaster_login?.toLowerCase() !== login ||
        !Array.isArray(data.segments) ||
        !pagination || (pagination.cursor != null && typeof pagination.cursor !== 'string')) {
      throw new Error('invalid_schedule_response');
    }
    const vacation = data.vacation && [Date.parse(data.vacation.start_time), Date.parse(data.vacation.end_time)];
    if (vacation && (!vacation.every(Number.isFinite) || vacation[1] <= vacation[0])) throw new Error('invalid_vacation');
    return {items: data.segments.map(segment => normalize(segment, vacation)), cursor: pagination.cursor || ''};
  };

  const items = new Map();
  const seenCursors = new Set();
  let cursor = '';
  for (let page = 0; page < 4; page++) {
    const params = new URLSearchParams({first: '25', start_time: new Date(now - day).toISOString()});
    if (cursor) params.set('after', cursor);
    const result = await get(params, page === 0);
    for (const item of result.items) items.set(item.id, item);
    cursor = result.cursor;
    if (!cursor || result.items.some(item => item.start >= now + lookahead)) break;
    if (page === 3 || seenCursors.has(cursor)) throw new Error('schedule_pagination_incomplete');
    seenCursors.add(cursor);
  }
  const missing = trackedIds.filter(id => !items.has(id));
  if (missing.length) {
    const params = new URLSearchParams({start_time: new Date(now - day).toISOString()});
    for (const id of missing) params.append('id', id);
    for (const item of (await get(params, true)).items) items.set(item.id, item);
  }
  return [...items.values()].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

export function websiteSchedule(items, now) {
  return items.filter(item => !item.canceled && (item.end ?? item.start) > now).slice(0, 5).map(item => ({
    startTime: new Date(item.start).toISOString(),
    endTime: item.end === null ? '' : new Date(item.end).toISOString(),
    title: item.title, category: item.category,
  }));
}

export async function getSharedSchedule(db, now) {
  if (!db) return null;
  try {
    const row = await db.prepare('SELECT payload FROM twitch_schedule_snapshot WHERE singleton = 1').first();
    if (row) {
      const snapshot = JSON.parse(row.payload);
      if (Array.isArray(snapshot.items) && Number.isFinite(snapshot.checkedAt) &&
          snapshot.checkedAt <= now && now - snapshot.checkedAt < snapshotMaxAge) {
        return websiteSchedule(snapshot.items, now);
      }
    }
  } catch {
    // Before migration or during a D1 outage, the page uses its existing Twitch flow.
  }
  return null;
}
