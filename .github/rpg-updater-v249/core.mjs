import {readFile, writeFile, realpath, lstat, readdir, mkdtemp, rm} from 'node:fs/promises';
import {resolve, sep, basename, dirname, join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {check} from './check.mjs';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const need = (ok, code) => { if (!ok) throw new Error(code); };
const sha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
export function safePath(path) {
  need(typeof path === 'string' && path.length < 240 && !/[\\\x00-\x1f?#:]/.test(path), 'INVALID_PATH');
  need(!path.startsWith('/') && path.split('/').every(x => x && x !== '.' && x !== '..'), 'INVALID_PATH');
  need(!/(^|\/)\.env(?:\.|$)|(^|\/)(?:data|runtime|node_modules|\.git)(\/|$)/i.test(path), 'PRIVATE_PATH_REFUSED');
  return path;
}
// Reviewed exception: these guards only abort conflicting starts. They do
// not update, delete, or copy player rows. Keep the exact reviewed SQL pinned;
// future trigger migrations still require a separate review and control update.
const reviewedMigrations = new Map([
  ['0012_idle_activity_guards.sql', '32c7e13fd51c0bfd2625017f38b9cdef8b841aec9f0d1f5d50c410c47c85999a']
]);
export function additiveSql(text, migrationName = '') {
  if (reviewedMigrations.has(migrationName)) {
    need(hash(Buffer.from(text, 'utf8')) === reviewedMigrations.get(migrationName), 'REVIEWED_MIGRATION_HASH_MISMATCH');
    return;
  }
  const clean = text.replace(/'(?:''|[^'])*'/g,"''").replace(/\/\*[\s\S]*?\*\//g,' ').replace(/--[^\r\n]*/g,' ');
  const statements = clean.split(';').map(s=>s.trim()).filter(Boolean);
  need(statements.length > 0, 'EMPTY_MIGRATION');
  for (const statement of statements) {
    need(!/\b(?:DROP|DELETE|UPDATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|TRIGGER)\b/i.test(statement), 'NON_ADDITIVE_SQL_REFUSED');
    need(/^(?:CREATE\s+(?:TABLE|(?:UNIQUE\s+)?INDEX)\s+IF\s+NOT\s+EXISTS\b|ALTER\s+TABLE\s+[\w"`\[\]]+\s+ADD\s+(?:COLUMN\s+)?)/i.test(statement), 'SQL_REQUIRES_MANUAL_REVIEW');
  }
}
const retiredFiles = new Set(["MEIGEN_ADMIN_README.txt", "PASHAYOMI_LITE_NOTE.txt", "PASHAYOMI_LITE_OCR_BETA_NOTE.txt", "PASHAYOMI_LITE_V206_NOTE.txt", "PASHAYOMI_LITE_V207_NOTE.txt", "PASHAYOMI_LITE_V208_NOTE.txt", "PASHAYOMI_LITE_V209_NOTE.txt", "PASHAYOMI_LITE_V210_NOTE.txt", "PASHAYOMI_LITE_V211_NOTE.txt", "PASHAYOMI_LITE_V212_NOTE.txt", "PASHAYOMI_LITE_V213_NOTE.txt", "PASHAYOMI_LITE_V214_NOTE.txt", "PASHAYOMI_NOTE.txt", "PASHAYOMI_SERVER_OCR_SETUP.txt", "PASHAYOMI_V206_NOTE.txt", "PASHAYOMI_V207_NOTE.txt", "PASHAYOMI_V208_NOTE.txt", "PASHAYOMI_V209_NOTE.txt", "PASHAYOMI_V210_NOTE.txt", "PASHAYOMI_V211_NOTE.txt", "PASHAYOMI_V212_NOTE.txt", "PASHAYOMI_V213_NOTE.txt", "PASHAYOMI_V214_NOTE.txt", "PASHAYOMI_V215_NOTE.txt", "PASHAYOMI_V216_NOTE.txt", "PASHAYOMI_V217_NOTE.txt", "PASHAYOMI_V218_NOTE.txt", "PASHAYOMI_V229_OCR_TEXT_ONLY_NOTE.txt", "apps.html", "functions/api/meigen-submit.js", "functions/api/pashayomi-ocr.js", "meigen-data.js", "meigen-submit.html", "meigen.html", "meigen.js", "pashayomi-app.js", "pashayomi-style.css", "pashayomi.html", "quotes.html", "yuzu-secret-meigen-control-2026.html"]);
export function validateMeta(meta) {
  need(meta?.schema === 1 && /^[a-zA-Z0-9._-]{1,80}$/.test(meta.releaseId) && /^[a-f0-9]{32}$/.test(meta.nonce), 'INVALID_METADATA');
  need(sha(meta.baseCommit) && meta.compatibleBeforeNative === true, 'INVALID_BASE_OR_COMPATIBILITY');
  need(Array.isArray(meta.files) && meta.files.length > 0 && meta.files.length < 250, 'INVALID_FILE_COUNT');
  const names = new Set();
  for (const file of meta.files) {
    safePath(file.path);
    need(!file.path.startsWith('.github/') && file.path !== '.rpg-updates/release.json', 'CONTROL_FILE_IN_RELEASE');
    need(!names.has(file.path) && /^[a-f0-9]{64}$/.test(file.sha256) && (file.previousSha256 === null || /^[a-f0-9]{64}$/.test(file.previousSha256)), 'INVALID_FILE_HASH');
    names.add(file.path);
  }
  const deletions=meta.deletions??[];
  need(Array.isArray(deletions) && deletions.length<=retiredFiles.size,'INVALID_DELETIONS');
  for(const file of deletions){
    safePath(file.path);
    need(retiredFiles.has(file.path)&&!names.has(file.path)&&/^[a-f0-9]{64}$/.test(file.previousSha256),'UNAPPROVED_DELETION');
    names.add(file.path);
  }
  need(names.has('rpg-update-status.json'), 'PUBLIC_MARKER_MISSING');
  return meta;
}
async function localFile(root, path) {
  safePath(path);
  const base = await realpath(root), file = resolve(base, path);
  need(file.startsWith(base + sep), 'PATH_OUTSIDE_ROOT');
  need(!(await lstat(file)).isSymbolicLink() && (await realpath(file)).startsWith(base + sep), 'SYMLINK_REFUSED');
  const data = await readFile(file);
  need(data.length <= 8 * 1024 * 1024, 'FILE_TOO_LARGE');
  return data;
}

export async function run({config, mode, releaseSha, root, ghToken, cfToken, repository, requestId,
  fetcher=fetch, sleep=ms=>new Promise(r=>setTimeout(r,ms)), log=console.log,
  executeWrangler=async args=>{
    const command=join(dirname(fileURLToPath(import.meta.url)), 'node_modules/wrangler/bin/wrangler.js');
    try { await promisify(execFile)(process.execPath,[command,...args],{timeout:240000,maxBuffer:4*1024*1024,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}}); }
    catch { throw new Error('WRANGLER_MIGRATION_FAILED'); }
  }}) {
  need(repository === config.repository && ghToken && cfToken, 'TARGET_OR_SECRET_MISSING');
  need(['prepare','verify','verify-restore'].includes(mode) && sha(releaseSha) && /^[a-f0-9]{32}$/.test(requestId), 'INVALID_INPUT');
  const ghRoot=`https://api.github.com/repos/${config.repository}`;
  const cfRoot=`https://api.cloudflare.com/client/v4/accounts/${config.accountId}`;
  async function api(url, token, body) {
    let response;
    try { response=await fetcher(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)}); }
    catch { throw new Error('API_CONNECTION_FAILED'); }
    need(response.ok,`API_HTTP_${response.status}`);
    const data=await response.json();
    if(url.startsWith(cfRoot)){need(data.success === true,'CLOUDFLARE_API_REJECTED');return data.result;}
    return data;
  }
  const gh=path=>api(ghRoot+path,ghToken);
  const cf=(path,body)=>api(cfRoot+path,cfToken,body);
  const main=()=>gh('/git/ref/heads/main').then(x=>x.object.sha);
  await check(config,{token:cfToken,repository,fetcher,log});
  const commit=await gh('/git/commits/'+releaseSha);

  async function waitDeployment(target) {
    for(let i=0;i<100;i++){
      need(await main() === target,'MAIN_CHANGED_DURING_DEPLOYMENT');
      const deployments=await cf(`/pages/projects/${config.pagesProject}/deployments?env=production&per_page=25`);
      need(Array.isArray(deployments),'DEPLOYMENTS_INVALID');
      const matches=deployments.filter(x=>x.environment==='production'&&x.deployment_trigger?.metadata?.commit_hash===target);
      const success=matches.find(x=>x.latest_stage?.name==='deploy'&&x.latest_stage?.status==='success'&&!x.is_skipped);
      if(success){
        const project=await cf('/pages/projects/'+config.pagesProject);
        if(project.canonical_deployment?.deployment_trigger?.metadata?.commit_hash === target){
          log('OK: exact production commit deployed');return;
        }
      }
      if(matches.length && matches.every(x=>x.is_skipped||['failure','canceled'].includes(x.latest_stage?.status))) throw new Error('PAGES_DEPLOYMENT_FAILED');
      if(i%6===0)log('Waiting for Cloudflare production deployment...');
      await sleep(6000);
    }
    throw new Error('PAGES_DEPLOYMENT_TIMEOUT');
  }
  if(mode==='verify-restore'){
    need(commit.parents?.length === 1 && /^RPG restore [a-f0-9]{32}$/.test(commit.message),'INVALID_RESTORE_COMMIT');
    const failedSha=commit.parents[0].sha;
    const failed=await gh('/contents/.rpg-updates/release.json?ref='+failedSha);
    const meta=validateMeta(JSON.parse(Buffer.from(failed.content.replace(/\s/g,''),'base64').toString('utf8')));
    const before=await gh('/git/commits/'+meta.baseCommit);
    need(commit.tree.sha===before.tree.sha,'RESTORE_TREE_MISMATCH');
    await waitDeployment(releaseSha);
    log('RESTORE_VERIFIED');return {status:'restored',commit:releaseSha};
  }

  const meta=validateMeta(JSON.parse((await localFile(root,'.rpg-updates/release.json')).toString('utf8')));
  need(commit.parents?.length === 1 && commit.parents[0].sha===meta.baseCommit,'RELEASE_PARENT_MISMATCH');
  const baseState=await main();
  need(mode==='prepare' ? [meta.baseCommit,releaseSha].includes(baseState) : baseState===releaseSha,'MAIN_CHANGED');
  const comparison=await gh(`/compare/${meta.baseCommit}...${releaseSha}`);
  need(comparison.total_commits===1 && comparison.files?.length<300,'DIFF_TOO_LARGE_OR_MULTI_COMMIT');
  const changed=new Map(comparison.files.map(x=>[x.filename,x]));
  need(changed.size===meta.files.length+(meta.deletions?.length??0)+1 && changed.has('.rpg-updates/release.json'),'UNDECLARED_FILE_CHANGE');
  for(const file of meta.deletions??[]){
    need(changed.get(file.path)?.status==='removed','EXPECTED_REMOVAL_MISSING');
    const old=await gh('/contents/'+file.path.split('/').map(encodeURIComponent).join('/')+'?ref='+meta.baseCommit);
    need(old.encoding==='base64'&&hash(Buffer.from(old.content.replace(/\s/g,''),'base64'))===file.previousSha256,'REMOVED_FILE_HASH_MISMATCH');
  }
  const sqlFiles=[];
  for(const file of meta.files){
    const change=changed.get(file.path);
    need(change && ['added','modified'].includes(change.status),'REMOVAL_OR_RENAME_REFUSED');
    const bytes=await localFile(root,file.path);
    need(hash(bytes)===file.sha256,'RELEASE_FILE_HASH_MISMATCH');
    if(file.previousSha256===null)need(change.status==='added','EXPECTED_NEW_FILE_EXISTS');
    else {
      need(change.status==='modified','EXPECTED_PREVIOUS_FILE_MISSING');
      const old=await gh('/contents/'+file.path.split('/').map(encodeURIComponent).join('/')+'?ref='+meta.baseCommit);
      need(old.encoding==='base64'&&hash(Buffer.from(old.content.replace(/\s/g,''),'base64'))===file.previousSha256,'PREVIOUS_FILE_HASH_MISMATCH');
    }
    if(file.path.startsWith('.rpg-updates/migrations/')){
      need(file.previousSha256===null && /^\.rpg-updates\/migrations\/\d{4}_[a-z0-9_-]+\.sql$/.test(file.path),'MIGRATION_IMMUTABLE_OR_INVALID');
      additiveSql(bytes.toString('utf8'), file.path.split('/').at(-1)); sqlFiles.push(file.path);
    }else need(!file.path.startsWith('.rpg-updates/'),'UNSUPPORTED_CONTROL_PATH');
  }
  const marker=JSON.parse((await localFile(root,'rpg-update-status.json')).toString('utf8'));
  need(marker.schema===1&&marker.releaseId===meta.releaseId&&marker.nonce===meta.nonce,'MARKER_MISMATCH');

  if(mode==='prepare'){
    let existingMigrations=[];
    try { existingMigrations=await readdir(resolve(root,'.rpg-updates/migrations')); } catch(error) { if(error.code!=='ENOENT')throw error; }
    if(existingMigrations.some(x=>x.endsWith('.sql'))){
      const project=await cf('/pages/projects/'+config.pagesProject);
      const databaseId=project.deployment_configs.production.d1_databases[config.requiredD1].id;
      const migrationRoot=resolve(root,'.rpg-updates/migrations');
      // Inherited files must remain immutable; the one-commit diff above refuses
      // modifications to old migrations. All are passed to Wrangler's ledger.
      const names=(await readdir(migrationRoot)).filter(x=>x.endsWith('.sql')).sort();
      need(names.every(x=>/^\d{4}_[a-z0-9_-]+\.sql$/.test(x)),'INVALID_MIGRATION_FILENAME');
      for(const name of names)additiveSql((await localFile(root,'.rpg-updates/migrations/'+name)).toString('utf8'), name);
      const temporary=await mkdtemp(join(tmpdir(),'yuzu-rpg-migration-'));
      try {
        const configFile=join(temporary,'wrangler.json');
        await writeFile(configFile,JSON.stringify({name:'yuzu-rpg-migrations',account_id:config.accountId,compatibility_date:'2026-11-01',d1_databases:[{binding:config.requiredD1,database_name:config.databaseName,database_id:databaseId,migrations_dir:migrationRoot,migrations_table:'rpg_auto_migrations_v1'}]}));
        await executeWrangler(['d1','migrations','apply',config.databaseName,'--remote','--config',configFile]);
        const rows=await cf(`/d1/database/${databaseId}/query`,{sql:'SELECT name FROM rpg_auto_migrations_v1',params:[]});
        need(rows?.[0]?.success===true,'MIGRATION_LEDGER_QUERY_FAILED');
        const applied=new Set(rows[0].results.map(x=>x.name));
        need(names.every(x=>applied.has(x)),'MIGRATION_LEDGER_INCOMPLETE');
      }finally{if(dirname(temporary)===tmpdir()&&basename(temporary).startsWith('yuzu-rpg-migration-'))await rm(temporary,{recursive:true,force:true});}
    }
    log('PREPARE_PASSED: additive SQL ready; production branch not changed');
    return {status:'prepared',commit:releaseSha};
  }
  await waitDeployment(releaseSha);
  let healthy=false;
  for(let i=0;i<12;i++){
    try {
      const response=await fetcher(config.publicUrl+'/rpg-update-status.json?check='+meta.nonce,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
      if(response.ok){const data=await response.json();healthy=data.nonce===meta.nonce&&data.releaseId===meta.releaseId;}
    }catch{}
    if(healthy)break;
    await sleep(5000);
  }
  need(healthy,'PUBLIC_MARKER_NOT_UPDATED');
  for(const path of ['/', '/api/rpg-town', '/api/rpg-info']){
    const response=await fetcher(config.publicUrl+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
    need(response.ok,'PUBLIC_HEALTH_CHECK_FAILED');
    if(path!=='/'){
      const data=await response.json();need(data&&typeof data==='object'&&!data.error&&data.configured!==false,'PUBLIC_API_INVALID_JSON');
    }
  }
  need(await main()===releaseSha,'MAIN_CHANGED_AFTER_VERIFY');
  log('PUBLISH_VERIFIED');return {status:'verified',commit:releaseSha};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const config=JSON.parse(await readFile(new URL('./config.json',import.meta.url),'utf8'));
    await run({config,mode:process.env.UPDATE_MODE,releaseSha:process.env.UPDATE_RELEASE_SHA,requestId:process.env.UPDATE_REQUEST_ID,root:resolve(process.env.UPDATE_RELEASE_ROOT||'release'),repository:process.env.GITHUB_REPOSITORY,ghToken:process.env.GITHUB_TOKEN,cfToken:process.env.CLOUDFLARE_API_TOKEN});
  }catch(error){console.error(/^[A-Z0-9_]+$/.test(error.message)?error.message:'UPDATE_FAILED');process.exitCode=1;}
}
