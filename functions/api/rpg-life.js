import {snapshotGet} from './rpg-snapshot.js';
import {json} from './town-support.js';
import {gameContext,rows} from './rpg-play.js';
import {hash,randomToken} from './rpg-account.js';
import {readBody} from './rpg-info.js';
import {WORK_JOBS} from '../../work-data.js';
import {PLAY} from '../../rpg-play-data.js';
import {DAY,BIRTH_DAYS,WORK_DAYS,aliasName,nameCandidates,familyStage,familyProjection} from '../../life-data.js';
const validId=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
const uuid=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
function codeValue(value){const s=typeof value==='string'?value.replace(/[\s-]/g,'').toLowerCase():'';if(!/^[a-f0-9]{32}$/.test(s))throw Error('invalid_code');return s;}
const codeHash=value=>hash('yuzu-life-code-v1:'+codeValue(value));
const active=async c=>c.db.prepare('SELECT family_id FROM web_life_members WHERE public_id=?').bind(c.id).first();
const memberFamily=async(c,id)=>c.db.prepare('SELECT * FROM web_life_families WHERE id=? AND (parent_a=? OR parent_b=?)').bind(id,c.id,c.id).first();
const nameOf=(c,id,fallback='冒険者')=>c.snapshot.players.find(p=>p.id===id)?.name||fallback;
function dto(c,f,now){const stage=familyStage(f,now),other=f.parent_a===c.id?f.parent_b:f.parent_a,candidates=JSON.parse(f.candidates_json),job=WORK_JOBS.find(x=>x.id===f.child_job);
 const events=[{at:f.formed_at,text:'二人が恋人になりました'}],cutoff=f.ended_at===null?now:Math.min(now,f.ended_at);
 if(cutoff>=stage.marriageAt)events.push({at:stage.marriageAt,text:'結婚して、二人の家ができました'});
 if(stage.born)events.push({at:stage.birthAt,text:(f.child_name||candidates[0])+'が生まれました'});
 if(stage.mature)events.push({at:stage.workAt,text:(f.child_name||candidates[0])+'が成長し、'+(job?.job||'街の仕事')+'で働き始めました'});
 if(f.ended_at!==null)events.push({at:f.ended_at,text:'関係を解消しました。思い出と生まれた子供の記録は残ります'});
 events.sort((a,b)=>a.at-b.at);
 return {id:f.id,formedAt:f.formed_at,endedAt:f.ended_at,revision:f.revision,partner:{id:other,name:nameOf(c,other,f.parent_a===c.id?f.name_b:f.name_a)},parents:[f.name_a,f.name_b],aliases:[f.alias_a,f.alias_b],...stage,
  candidates,round:f.name_round,votes:[f.vote_a,f.vote_b],myVote:f.parent_a===c.id?f.vote_a:f.vote_b,nameConfirmed:!!f.child_name,
  child:{name:f.child_name||candidates[0],jobId:f.child_job,job:job?.job||f.child_job,workplace:job?.name||'街の仕事'},events};
}
function renameName(value){
 if(typeof value!=='string')throw Error('invalid_name');
 const name=value.normalize('NFC').trim();
 if(!name||[...name].length>20||/[\p{C}<>]/u.test(name))throw Error('invalid_name');
 return name;
}
const renameHash=value=>hash('yuzu-child-rename-v259:'+codeValue(value));
async function renameRow(c,f){return c.db.prepare('SELECT * FROM web_life_rename WHERE family_id=?').bind(f.id).first();}
async function renamePreview(c,d){
 if(!validId(d.familyId))throw Error('family_missing');
 const f=await memberFamily(c,d.familyId),now=Date.now();
 if(!f||!familyStage(f,now).born)throw Error('child_not_born');
 const row=await renameRow(c,f);
 if(!row||row.used||row.expires_at<=now||row.base_revision!==f.revision||row.code_hash!==await renameHash(d.code))throw Error('rename_expired');
 if(row.proposer===c.id)throw Error('other_parent_required');
 const owner=await c.db.prepare('SELECT active FROM rpg_accounts WHERE public_id=?').bind(row.proposer).first();
 if(!owner?.active)throw Error('rename_expired');
 return {family:f,row};
}
async function renameMutate(c,d,op,payload){
 if(!validId(d.familyId)||d.accepted!==true)throw Error('confirmation_required');
 const f=await memberFamily(c,d.familyId),now=Date.now();
 if(!f||!familyStage(f,now).born)throw Error('child_not_born');
 if(d.action==='rename_propose'){
  if(d.revision!==f.revision)throw Error('family_changed');
  const name=renameName(d.name),code=codeValue(d.code),h=await renameHash(code),old=await renameRow(c,f);
  if(name===(f.child_name||JSON.parse(f.candidates_json)[0]))throw Error('same_name');
  if(old&&now-old.created_at<60000)throw Error('code_cooldown');
  const gate='EXISTS(SELECT 1 FROM web_life_families WHERE id=? AND revision=?)';
  const stmt=c.db.prepare(`INSERT INTO web_life_rename(family_id,proposal_id,proposer,proposed_name,code_hash,base_revision,created_at,expires_at,used)
   SELECT ?,?,?,?,?,?,?,?,0 WHERE ${gate}
   ON CONFLICT(family_id) DO UPDATE SET proposal_id=excluded.proposal_id,proposer=excluded.proposer,proposed_name=excluded.proposed_name,code_hash=excluded.code_hash,base_revision=excluded.base_revision,created_at=excluded.created_at,expires_at=excluded.expires_at,used=0
   WHERE web_life_rename.created_at<=?`).bind(f.id,op,c.id,name,h,f.revision,now,now+DAY,f.id,f.revision,now-60000);
  await c.db.batch([stmt,await remember(c,d,op,payload,'EXISTS(SELECT 1 FROM web_life_rename WHERE family_id=? AND proposal_id=?)',[f.id,op])]);
  return {renameCode:code.match(/.{8}/g).join('-'),renameFamily:f.id,renameProposal:op};
 }
 if(d.action==='rename_approve'){
  const {row}=await renamePreview(c,d);
  if(d.proposalId!==row.proposal_id||d.name!==row.proposed_name)throw Error('rename_expired');
  const gate=`EXISTS(SELECT 1 FROM web_life_rename r JOIN rpg_accounts a ON a.public_id=r.proposer WHERE r.family_id=web_life_families.id AND r.proposal_id=? AND r.code_hash=? AND r.proposer<>? AND r.base_revision=web_life_families.revision AND r.expires_at>? AND r.used=0 AND a.active=1)`;
  const updated='EXISTS(SELECT 1 FROM web_life_families WHERE id=? AND last_op=?)';
  await c.db.batch([
   c.db.prepare('UPDATE web_life_families SET child_name=?,revision=revision+1,last_op=? WHERE id=? AND revision=? AND '+gate).bind(row.proposed_name,op,f.id,f.revision,row.proposal_id,row.code_hash,c.id,now),
   c.db.prepare('UPDATE web_life_rename SET used=1 WHERE family_id=? AND proposal_id=? AND '+updated).bind(f.id,row.proposal_id,f.id,op),
   await remember(c,d,op,payload,updated,[f.id,op])
  ]);return {};
 }
 throw Error('invalid_action');
}

async function state(c,extra={}){
 const now=Date.now(),profile=await c.db.prepare('SELECT alias,code_expires,code_hash,issued_at FROM web_life_profiles WHERE public_id=?').bind(c.id).first();
 const current=await active(c),families=await rows(c.db.prepare('SELECT * FROM web_life_families WHERE parent_a=? OR parent_b=? ORDER BY formed_at DESC,id DESC LIMIT 50').bind(c.id,c.id));
 const requests=await rows(c.db.prepare(`SELECT r.sender,r.target,r.nonce,r.expires_at FROM web_life_requests r
 JOIN web_life_profiles a ON a.public_id=r.sender JOIN web_life_profiles b ON b.public_id=r.target
 JOIN rpg_accounts aa ON aa.public_id=r.sender JOIN rpg_accounts bb ON bb.public_id=r.target
 WHERE (r.sender=? OR r.target=?) AND r.expires_at>? AND a.code_hash=r.sender_code AND b.code_hash=r.target_code
 AND a.code_expires>? AND b.code_expires>? AND aa.active=1 AND bb.active=1
 AND NOT EXISTS(SELECT 1 FROM web_life_members m WHERE m.public_id=r.sender OR m.public_id=r.target)`).bind(c.id,c.id,now,now,now));
 const worker=await c.db.prepare('SELECT * FROM web_life_workers WHERE public_id=?').bind(c.id).first();
 let workerDto=null;if(worker){const family=await memberFamily(c,worker.family_id);if(family){const stage=familyStage(family,now);workerDto={familyId:family.id,cursorMs:worker.cursor_ms,born:stage.born,mature:stage.mature,workAt:stage.workAt,projection:familyProjection(worker,family,now),child:dto(c,family,now).child};}}
 const claims=await rows(c.db.prepare('SELECT id,family_id,minutes,exp,coins,status,created_at FROM web_life_claims WHERE public_id=? ORDER BY created_at DESC,id DESC LIMIT 12').bind(c.id));
 const renames=await rows(c.db.prepare('SELECT r.family_id,r.proposal_id,r.proposer,r.proposed_name,r.expires_at FROM web_life_rename r JOIN web_life_families f ON f.id=r.family_id WHERE (f.parent_a=? OR f.parent_b=?) AND r.used=0 AND r.expires_at>? AND r.base_revision=f.revision').bind(c.id,c.id,now));
 return {renames:renames.map(r=>({familyId:r.family_id,proposalId:r.proposal_id,name:r.proposed_name,expiresAt:r.expires_at,mine:r.proposer===c.id})),ok:true,me:c.id,name:c.player.name,now,profile:{alias:profile?.alias||aliasName(c.player.name),hasCode:!!profile?.code_hash&&profile.code_expires>now,expiresAt:profile?.code_expires||0,nextIssueAt:(profile?.issued_at||0)+60000},currentFamily:current?.family_id||null,families:families.map(f=>dto(c,f,now)),requests:requests.map(r=>({direction:r.sender===c.id?'outgoing':'incoming',partnerId:r.sender===c.id?r.target:r.sender,partnerName:nameOf(c,r.sender===c.id?r.target:r.sender),nonce:r.nonce,expiresAt:r.expires_at})),worker:workerDto,claims,...extra};
}
async function targetForCode(c,d){
 const h=await codeHash(d.code),now=Date.now();
 const target=await c.db.prepare('SELECT p.*,a.active FROM web_life_profiles p JOIN rpg_accounts a ON a.public_id=p.public_id WHERE p.code_hash=? AND p.code_expires>? AND a.active=1').bind(h,now).first();
 if(!target||!c.snapshot.players.some(p=>p.id===target.public_id))throw Error('invalid_code');
 if(target.public_id===c.id)throw Error('self_pair');
 if(await c.db.prepare('SELECT public_id FROM web_life_members WHERE public_id=? OR public_id=?').bind(c.id,target.public_id).first())throw Error('already_paired');
 return target;
}
async function remember(c,d,op,payload,guard,args){
 return c.db.prepare('INSERT INTO web_life_operations(id,public_id,action,payload_hash,created_at) SELECT ?,?,?,?,? WHERE '+guard).bind(op,c.id,d.action,payload,Date.now(),...args);
}
async function connect(c,d,op,payload){
 if(d.accepted!==true||!validId(d.targetId))throw Error('confirmation_required');
 const target=await targetForCode(c,d),now=Date.now();if(target.public_id!==d.targetId)throw Error('partner_changed');
 const own=await c.db.prepare('SELECT * FROM web_life_profiles WHERE public_id=? AND code_hash IS NOT NULL AND code_expires>?').bind(c.id,now).first();if(!own)throw Error('own_code_required');
 const order=[own,target].sort((a,b)=>a.public_id.localeCompare(b.public_id)),[a,b]=order;
 const familyId=await hash('yuzu-family-v1:'+a.public_id+':'+a.code_hash+':'+b.public_id+':'+b.code_hash);
 const privateGame=await snapshotGet(c.env,'yuzu_rpg_game_private_v1');if(privateGame?.capturedAt!==c.snapshot.capturedAt)throw Error('sync_required');
 const inherited=[];for(const person of order){
  const saved=privateGame.players.find(p=>p.id===person.public_id),pool=WORK_JOBS.filter(j=>j.price===0||saved?.ownedJobs?.includes(j.id));
  let job=pool.find(j=>j.id.toLowerCase()===String(saved?.activeJob||'').toLowerCase()||j.job===saved?.activeJob||PLAY.jobs.find(p=>p.id===j.id)?.number===saved?.activeJob);
  if(!job){const choices=saved?.activeJob==='random_owned'?pool:pool.filter(j=>j.price===0);job=choices[parseInt((await hash(familyId+person.public_id)).slice(0,8),16)%choices.length];}
  inherited.push(job.id);
 }
 const childJob=inherited[parseInt(familyId.slice(0,8),16)%2],candidates=nameCandidates(a.alias,b.alias),idle='NOT EXISTS(SELECT 1 FROM web_life_members WHERE public_id=? OR public_id=?)';
 const requestGuard=idle+' AND EXISTS(SELECT 1 FROM web_life_profiles WHERE public_id=? AND code_hash=? AND code_expires>?) AND EXISTS(SELECT 1 FROM web_life_profiles WHERE public_id=? AND code_hash=? AND code_expires>?) AND EXISTS(SELECT 1 FROM rpg_accounts WHERE public_id=? AND active=1) AND EXISTS(SELECT 1 FROM rpg_accounts WHERE public_id=? AND active=1)';
 const s=[c.db.prepare(`INSERT INTO web_life_requests(sender,target,sender_code,target_code,created_at,expires_at,nonce) SELECT ?,?,?,?,?,?,? WHERE ${requestGuard}
 ON CONFLICT(sender) DO UPDATE SET target=excluded.target,sender_code=excluded.sender_code,target_code=excluded.target_code,created_at=excluded.created_at,expires_at=excluded.expires_at,nonce=excluded.nonce`).bind(c.id,target.public_id,own.code_hash,target.code_hash,now,Math.min(own.code_expires,target.code_expires),op,c.id,target.public_id,c.id,own.code_hash,now,target.public_id,target.code_hash,now,target.public_id,c.id)];
 const reciprocal=`EXISTS(SELECT 1 FROM web_life_requests r JOIN web_life_requests q ON q.sender=r.target AND q.target=r.sender WHERE r.sender=? AND r.target=? AND r.nonce=? AND r.expires_at>? AND q.expires_at>? AND r.sender_code=q.target_code AND r.target_code=q.sender_code)`;
 s.push(c.db.prepare(`INSERT INTO web_life_families(id,parent_a,parent_b,name_a,name_b,alias_a,alias_b,formed_at,child_job,candidates_json,formed_op,last_op)
 SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${idle} AND ${reciprocal} ON CONFLICT(id) DO NOTHING`).bind(familyId,a.public_id,b.public_id,nameOf(c,a.public_id),nameOf(c,b.public_id),a.alias,b.alias,now,childJob,JSON.stringify(candidates),op,op,c.id,target.public_id,c.id,target.public_id,op,now,now));
 const formed='EXISTS(SELECT 1 FROM web_life_families WHERE id=? AND formed_op=?)';
 for(const person of order){
  s.push(c.db.prepare('INSERT INTO web_life_members(public_id,family_id) SELECT ?,? WHERE '+formed).bind(person.public_id,familyId,familyId,op));
  s.push(c.db.prepare('INSERT INTO web_life_workers(public_id,family_id,cursor_ms,last_op) SELECT ?,?,?,? WHERE '+formed+' ON CONFLICT(public_id) DO NOTHING').bind(person.public_id,familyId,now+WORK_DAYS*DAY,op,familyId,op));
  s.push(c.db.prepare('UPDATE web_life_profiles SET code_hash=NULL,code_expires=0 WHERE public_id=? AND '+formed).bind(person.public_id,familyId,op));
 }
 s.push(await remember(c,d,op,payload,'EXISTS(SELECT 1 FROM web_life_requests WHERE sender=? AND nonce=?)',[c.id,op]));
 await c.db.batch(s);return {};
}
async function salary(c,d,op,payload){
 const now=Date.now(),old=await c.db.prepare('SELECT * FROM web_life_workers WHERE public_id=?').bind(c.id).first();
 if(!old)throw Error('no_worker');
 const previous=await memberFamily(c,old.family_id);if(!previous)throw Error('family_missing');
 const projection=familyProjection(old,previous,now);let target=old.family_id;
 if(d.action==='select_worker'){
  if(!validId(d.familyId))throw Error('family_missing');const family=await memberFamily(c,d.familyId);
  if(!family||!familyStage(family,now).mature)throw Error('child_not_grown');if(family.id===target)throw Error('same_worker');target=family.id;
 }else if(!familyStage(previous,now).mature||projection.minutes<1)throw Error('not_ready');
 const guard='EXISTS(SELECT 1 FROM web_life_workers WHERE public_id=? AND revision=? AND last_op=?)',revision=old.revision+1;
 const s=[c.db.prepare('UPDATE web_life_workers SET family_id=?,cursor_ms=?,exp_remainder=?,coin_remainder=?,revision=revision+1,last_op=? WHERE public_id=? AND revision=?').bind(target,projection.nextCursor,projection.expRemainder,projection.coinRemainder,op,c.id,old.revision)];
 if(projection.minutes>0)s.push(c.db.prepare('INSERT INTO web_life_claims(id,public_id,family_id,minutes,exp,coins,created_at) SELECT ?,?,?,?,?,?,? WHERE '+guard).bind(op,c.id,old.family_id,projection.minutes,projection.exp,projection.coins,now,c.id,revision,op));
 s.push(await remember(c,d,op,payload,guard,[c.id,revision,op]));await c.db.batch(s);return {};
}
async function mutate(c,d,op,payload){
 const now=Date.now();
 if(d.action==='issue'){
  if(await active(c))throw Error('already_paired');
  const raw=codeValue(d.code),h=await codeHash(raw),alias=aliasName(d.alias||c.player.name),old=await c.db.prepare('SELECT issued_at FROM web_life_profiles WHERE public_id=?').bind(c.id).first();
  if(old&&now-old.issued_at<60000)throw Error('code_cooldown');
  const s=[c.db.prepare(`INSERT INTO web_life_profiles(public_id,alias,code_hash,code_expires,issued_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM web_life_members WHERE public_id=?)
   ON CONFLICT(public_id) DO UPDATE SET alias=excluded.alias,code_hash=excluded.code_hash,code_expires=excluded.code_expires,issued_at=excluded.issued_at WHERE web_life_profiles.issued_at<=? AND NOT EXISTS(SELECT 1 FROM web_life_members WHERE public_id=?)`).bind(c.id,alias,h,now+DAY,now,c.id,now-60000,c.id),await remember(c,d,op,payload,'EXISTS(SELECT 1 FROM web_life_profiles WHERE public_id=? AND code_hash=? AND issued_at=?)',[c.id,h,now])];
  await c.db.batch(s);return {code:raw.match(/.{8}/g).join('-')};
 }
 if(['rename_propose','rename_approve'].includes(d.action))return renameMutate(c,d,op,payload);
 if(d.action==='connect')return connect(c,d,op,payload);
 if(d.action==='withdraw'){
  if(!validId(d.nonce))throw Error('request_changed');
  const s=[await remember(c,d,op,payload,'EXISTS(SELECT 1 FROM web_life_requests WHERE sender=? AND nonce=?)',[c.id,d.nonce]),c.db.prepare('DELETE FROM web_life_requests WHERE sender=? AND nonce=? AND EXISTS(SELECT 1 FROM web_life_operations WHERE id=?)').bind(c.id,d.nonce,op)];await c.db.batch(s);return {};
 }
 if(['claim','select_worker'].includes(d.action))return salary(c,d,op,payload);
 if(!validId(d.familyId))throw Error('family_missing');
 const family=await memberFamily(c,d.familyId);if(!family)throw Error('family_missing');
 if(d.action==='end'){
  if(d.accepted!==true||typeof d.confirmation!=='string')throw Error('confirmation_required');
  const challenge=await hash('life-end-v1:'+d.confirmation);
  const guard=`EXISTS(SELECT 1 FROM web_life_end_tokens WHERE id=? AND public_id=? AND family_id=? AND revision=web_life_families.revision AND expires_at>? AND used=0 AND child_born=?)`;
  const s=[c.db.prepare('UPDATE web_life_families SET ended_at=?,ended_by=?,revision=revision+1,last_op=? WHERE id=? AND ended_at IS NULL AND '+guard).bind(now,c.id,op,family.id,challenge,c.id,family.id,now,familyStage(family,now).born?1:0)];
  const ended='EXISTS(SELECT 1 FROM web_life_families WHERE id=? AND last_op=? AND ended_at IS NOT NULL)';
  s.push(c.db.prepare('UPDATE web_life_end_tokens SET used=1 WHERE id=? AND '+ended).bind(challenge,family.id,op));
  s.push(c.db.prepare('DELETE FROM web_life_members WHERE family_id=? AND '+ended).bind(family.id,family.id,op));
  s.push(c.db.prepare('DELETE FROM web_life_workers WHERE family_id=? AND '+ended+' AND ?<?').bind(family.id,family.id,op,now,family.formed_at+BIRTH_DAYS*DAY));
  s.push(c.db.prepare('UPDATE web_life_profiles SET code_hash=NULL,code_expires=0 WHERE (public_id=? OR public_id=?) AND '+ended).bind(family.parent_a,family.parent_b,family.id,op));
  s.push(c.db.prepare('DELETE FROM web_life_requests WHERE (sender=? OR sender=? OR target=? OR target=?) AND '+ended).bind(family.parent_a,family.parent_b,family.parent_a,family.parent_b,family.id,op));
  s.push(await remember(c,d,op,payload,ended,[family.id,op]));await c.db.batch(s);return {};
 }
 if(!Number.isInteger(d.revision)||d.revision!==family.revision)throw Error('family_changed');
 if(family.ended_at!==null||now>=family.formed_at+BIRTH_DAYS*DAY||family.child_name)throw Error('name_locked');
 const gate='id=? AND revision=? AND ended_at IS NULL AND child_name IS NULL';let statement;
 if(d.action==='vote'){
  if(!Number.isInteger(d.choice)||d.choice<0||d.choice>2)throw Error('invalid_choice');const choices=JSON.parse(family.candidates_json),field=family.parent_a===c.id?'vote_a':'vote_b',other=field==='vote_a'?'vote_b':'vote_a';
  statement=c.db.prepare(`UPDATE web_life_families SET ${field}=?,child_name=CASE WHEN ${other}=? THEN ? ELSE child_name END,revision=revision+1,last_op=? WHERE ${gate}`).bind(d.choice,d.choice,choices[d.choice],op,family.id,family.revision);
 }else if(d.action==='reroll'){
  if(family.name_round>=3)throw Error('reroll_limit');statement=c.db.prepare('UPDATE web_life_families SET candidates_json=?,name_round=name_round+1,vote_a=NULL,vote_b=NULL,revision=revision+1,last_op=? WHERE '+gate).bind(JSON.stringify(nameCandidates(family.alias_a,family.alias_b,family.name_round+1)),op,family.id,family.revision);
 }else throw Error('invalid_action');
 await c.db.batch([statement,await remember(c,d,op,payload,'EXISTS(SELECT 1 FROM web_life_families WHERE id=? AND last_op=?)',[family.id,op])]);return {};
}
export async function onRequest({request,env}){
 try {
  if(!['GET','POST'].includes(request.method))return json({error:'method'},405);
  const c=await gameContext(request,env,request.method==='POST');if(request.method==='GET')return json(await state(c));
  const d=await readBody(request,4096),now=Date.now();
  if(d.action==='preview'){
   const target=await targetForCode(c,d);return json({ok:true,targetId:target.public_id,name:nameOf(c,target.public_id),alias:target.alias});
  }
  if(d.action==='rename_preview'){const {family,row}=await renamePreview(c,d);return json({ok:true,name:row.proposed_name,oldName:family.child_name||JSON.parse(family.candidates_json)[0],proposalId:row.proposal_id,familyId:family.id,expiresAt:row.expires_at});}
  if(d.action==='end_preview'){
   if(!validId(d.familyId))throw Error('family_missing');const family=await memberFamily(c,d.familyId);
   if(!family||family.ended_at!==null)throw Error('family_changed');
   const token=randomToken(),id=await hash('life-end-v1:'+token);
   await c.db.prepare('INSERT INTO web_life_end_tokens(id,public_id,family_id,revision,expires_at,child_born) VALUES(?,?,?,?,?,?)').bind(id,c.id,family.id,family.revision,now+120000,familyStage(family,now).born?1:0).run();
   return json({ok:true,confirmation:token,expiresAt:now+120000,family:dto(c,family,now)});
  }
  if(!uuid(d.requestId))throw Error('invalid_request');
  const op=await hash('yuzu-life-operation-v1:'+c.id+':'+d.requestId),payload=await hash(JSON.stringify(Object.fromEntries(Object.entries(d).sort(([a],[b])=>a.localeCompare(b)))));
  const receipt=await c.db.prepare('SELECT action,payload_hash FROM web_life_operations WHERE id=? AND public_id=?').bind(op,c.id).first();
  if(receipt){if(receipt.action!==d.action||receipt.payload_hash!==payload)throw Error('request_changed');let extra={};if(d.action==='issue'){const current=await c.db.prepare('SELECT code_hash,code_expires FROM web_life_profiles WHERE public_id=?').bind(c.id).first();if(current?.code_hash===await codeHash(d.code)&&current.code_expires>now)extra.code=codeValue(d.code).match(/.{8}/g).join('-');}if(d.action==='rename_propose'){const row=await c.db.prepare('SELECT * FROM web_life_rename WHERE family_id=? AND proposal_id=? AND proposer=? AND used=0 AND expires_at>?').bind(d.familyId,op,c.id,now).first();if(row&&row.code_hash===await renameHash(d.code))extra={renameCode:codeValue(d.code).match(/.{8}/g).join('-'),renameFamily:d.familyId,renameProposal:op};}return json(await state(c,extra));}
  const extra=await mutate(c,d,op,payload);
  const saved=await c.db.prepare('SELECT id FROM web_life_operations WHERE id=? AND public_id=?').bind(op,c.id).first();if(!saved)throw Error(d.action==='end'?'confirmation_expired':'operation_conflict');
  return json(await state(c,extra));
 }catch(error){const known=['invalid_name','same_name','child_not_born','rename_expired','other_parent_required','login_required','csrf','not_configured','sync_required','invalid_code','self_pair','already_paired','confirmation_required','partner_changed','own_code_required','code_cooldown','request_changed','no_worker','family_missing','child_not_grown','same_worker','not_ready','confirmation_expired','family_changed','name_locked','invalid_choice','reroll_limit','invalid_action','invalid_request','operation_conflict'];const code=known.includes(error.message)?error.message:'life_unavailable';return json({error:code},code==='login_required'?401:code==='csrf'?403:['not_configured','sync_required','life_unavailable'].includes(code)?503:409);}
}
