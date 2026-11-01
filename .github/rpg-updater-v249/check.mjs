import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Only configuration metadata and sqlite_master names are read. No player rows.
export async function check(config, {token, repository, fetcher = fetch, log = console.log} = {}) {
  if (repository !== config.repository) throw new Error('TARGET_REPOSITORY_MISMATCH');
  if (!token || token.trim() !== token || /\s/.test(token)) throw new Error('CLOUDFLARE_API_TOKEN_MISSING_OR_INVALID');
  const root = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}`;
  async function api(path, body) {
    let response;
    try {
      response = await fetcher(root + path, {
        method: body ? 'POST' : 'GET',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        ...(body ? {body: JSON.stringify(body)} : {}),
        signal: AbortSignal.timeout(30000)
      });
    } catch { throw new Error('CLOUDFLARE_CONNECTION_FAILED'); }
    if (!response.ok) throw new Error(`CLOUDFLARE_HTTP_${response.status}`);
    let data;
    try { data = await response.json(); } catch { throw new Error('CLOUDFLARE_INVALID_RESPONSE'); }
    // Never include full API responses: Pages project data may contain secrets.
    if (data.success !== true) throw new Error('CLOUDFLARE_API_REJECTED');
    return data;
  }
  const {result: project} = await api(`/pages/projects/${encodeURIComponent(config.pagesProject)}`);
  if (project.name !== config.pagesProject || project.production_branch !== config.branch) throw new Error('PAGES_TARGET_MISMATCH');
  const source = project.source;
  const [owner, repo] = config.repository.split('/');
  if (source?.type !== 'github' || source.config?.owner !== owner || source.config?.repo_name !== repo) throw new Error('PAGES_GITHUB_SOURCE_MISMATCH');
  if (source.config.production_deployments_enabled === false) throw new Error('PAGES_AUTOMATIC_PRODUCTION_DEPLOYMENT_DISABLED');
  const production = project.deployment_configs?.production;
  for (const name of config.requiredKv) {
    if (!production?.kv_namespaces?.[name]?.namespace_id) throw new Error(`KV_BINDING_MISSING_${name}`);
  }
  log('OK: Pages project, production branch, GitHub source, KV bindings');
  let databases = [];
  for (let page = 1; page <= 100; page++) {
    const data = await api(`/d1/database?page=${page}&per_page=100`);
    if (!Array.isArray(data.result)) throw new Error('D1_LIST_INVALID');
    databases.push(...data.result);
    if (data.result.length < 100) break;
    if (page === 100) throw new Error('D1_LIST_TOO_LARGE');
  }
  const matches = databases.filter(db => db.name === config.databaseName);
  if (matches.length !== 1) throw new Error('D1_DATABASE_NAME_NOT_UNIQUE_OR_MISSING');
  const id = matches[0].uuid;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('D1_DATABASE_ID_INVALID');
  if (production?.d1_databases?.[config.requiredD1]?.id !== id) throw new Error('D1_BINDING_TARGET_MISMATCH');
  const data = await api(`/d1/database/${id}/query`, {
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", params: []
  });
  if (!Array.isArray(data.result) || data.result.length !== 1 || data.result[0].success !== true || !Array.isArray(data.result[0].results)) throw new Error('D1_QUERY_FAILED');
  const names = new Set(data.result[0].results.map(row => row.name));
  for (const name of ['rpg_accounts', 'web_commands', 'web_work_state', 'town_support_v2']) {
    if (!names.has(name)) throw new Error(`D1_REQUIRED_TABLE_MISSING_${name}`);
  }
  log('OK: D1 database, RPG_SUPPORT binding, required table names');
  log('CONNECTION_CHECK_PASSED: no SQL migrations or deployment performed');
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = JSON.parse(await readFile(new URL('./config.json', import.meta.url), 'utf8'));
    await check(config, {token: process.env.CLOUDFLARE_API_TOKEN, repository: process.env.GITHUB_REPOSITORY});
  } catch (error) {
    // Only controlled error codes reach logs, not remote error bodies or tokens.
    const message = /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'CHECK_FAILED';
    console.error(message);
    process.exitCode = 1;
  }
}
