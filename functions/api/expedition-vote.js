import { currentSession } from './rpg-account.js';
import { readBody } from './rpg-info.js';
import { snapshotGet } from './rpg-snapshot.js';
import { botAuth, json, sameOrigin } from './town-support.js';

const latest = 'SELECT ended_at,candidates,run_id,winner FROM rpg_expedition_polls ORDER BY ended_at DESC LIMIT 1';
const time = value => Number.isSafeInteger(value) && value >= 1600000000000 && value <= Date.now() + 60000;
const region = value => Number.isInteger(value) && value >= 0 && value < 120;

async function view(db, session) {
  const poll = await db.prepare(latest).first();
  if (!poll) return { poll: null, signedIn: Boolean(session) };
  const tally = await db.prepare(
    'SELECT region,COUNT(*) AS total FROM rpg_expedition_votes WHERE ended_at=? GROUP BY region'
  ).bind(poll.ended_at).all();
  const ballot = session && await db.prepare(
    'SELECT region FROM rpg_expedition_votes WHERE ended_at=? AND voter=?'
  ).bind(poll.ended_at, session.public_id).first();
  return {
    signedIn: Boolean(session), csrf: session?.csrf,
    poll: {
      id: poll.ended_at, closed: poll.run_id !== null, winner: poll.winner,
      candidates: JSON.parse(poll.candidates), tally: tally.results, voted: ballot?.region ?? null,
    },
  };
}

async function native(env, db, input) {
  if (input.action === 'open' && time(input.ended)) {
    const old = await db.prepare('SELECT ended_at FROM rpg_expedition_polls WHERE ended_at>=? LIMIT 1').bind(input.ended).first();
    if (old) return new Response('ok');
    const snapshot = await snapshotGet(env, 'yuzu_rpg_public_v1');
    if (!(Date.parse(snapshot?.capturedAt) >= input.ended + 15000)) return json({ error: 'waiting_for_sync' }, 409);
    const candidates = snapshot.world?.open?.flatMap((open, id) => open === true && region(id) ? [id] : []);
    if (!candidates?.length) return json({ error: 'no_candidates' }, 409);
    await db.prepare('INSERT OR IGNORE INTO rpg_expedition_polls(ended_at,candidates) VALUES (?,?)')
      .bind(input.ended, JSON.stringify(candidates)).run();
    return new Response('ok');
  }
  if (input.action === 'select' && time(input.started) && time(input.ended) && input.ended < input.started &&
      /^[a-f0-9]{32}$/.test(input.run || '') &&
      Array.isArray(input.open) && input.open.length <= 120 && input.open.every(region)) {
    const poll = await db.prepare(latest).first();
    if (!poll || poll.ended_at !== input.ended) return new Response('-1');
    const result = await db.prepare(`
      UPDATE rpg_expedition_polls
      SET run_id=?, winner=(
        SELECT region FROM rpg_expedition_votes
        WHERE ended_at=rpg_expedition_polls.ended_at AND region IN (SELECT value FROM json_each(?))
        GROUP BY region ORDER BY COUNT(*) DESC, region ASC LIMIT 1
      )
      WHERE ended_at=? AND run_id IS NULL AND ended_at=(SELECT MAX(ended_at) FROM rpg_expedition_polls)
      RETURNING winner
    `).bind(input.run, JSON.stringify(input.open), poll.ended_at).first();
    if (result) return new Response(String(result.winner ?? -1));
    const replay = await db.prepare('SELECT winner FROM rpg_expedition_polls WHERE ended_at=? AND run_id=?')
      .bind(poll.ended_at, input.run).first();
    return new Response(String(replay?.winner ?? -1));
  }
  return json({ error: 'invalid' }, 400);
}

export async function onRequest({ request, env }) {
  const db = env.RPG_SUPPORT;
  if (!db) return json({ error: 'unavailable' }, 503);
  try {
    if (request.method === 'GET') return json(await view(db, await currentSession(request, db)));
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    if (request.headers.has('Authorization')) {
      if (!await botAuth(request, env)) return json({ error: 'unauthorized' }, 401);
      return await native(env, db, await readBody(request, 4096));
    }
    if (!sameOrigin(request)) return json({ error: 'origin' }, 403);
    const session = await currentSession(request, db);
    if (!session) return json({ error: 'sign_in' }, 401);
    const input = await readBody(request, 1024);
    if (input.csrf !== session.csrf) return json({ error: 'csrf' }, 403);
    if (!time(input.poll) || !region(input.region)) return json({ error: 'invalid' }, 400);
    await db.prepare(`
      INSERT OR IGNORE INTO rpg_expedition_votes(ended_at,voter,region)
      SELECT ended_at,?,? FROM rpg_expedition_polls
      WHERE ended_at=? AND run_id IS NULL AND ended_at=(SELECT MAX(ended_at) FROM rpg_expedition_polls)
        AND ? IN (SELECT value FROM json_each(candidates))
    `).bind(session.public_id, input.region, input.poll, input.region).run();
    const result = await view(db, session);
    if (result.poll?.id !== input.poll || result.poll.voted === null) return json({ error: 'closed_or_invalid' }, 409);
    return json(result);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
}
