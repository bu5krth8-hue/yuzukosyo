import {json,sameOrigin} from './town-support.js';
import {readBody} from './rpg-info.js';
import {hash,randomToken} from './rpg-account.js';
import {requireGate,statusFor} from '../_world/access.js';
import {initial,reduce,view,SCHEMA} from '../_world/engine.js';
async function sharedFor(env,id){const publicData=await env.RPG_TOWN.get('yuzu_rpg_public_v1','json'),privateData=await env.RPG_TOWN.get('yuzu_rpg_game_private_v1','json'),town=await env.RPG_TOWN.get('yuzu_town_public_v1','json'),player=publicData?.players?.find(p=>p.id===id);if(!player)throw Error('sync_required');return{player,privatePlayer:privateData?.capturedAt===publicData.capturedAt?privateData.players.find(p=>p.id===id):null,town};}
async function state(db,id){let row=await db.prepare('SELECT revision,state_json,updated_at FROM world252_saves WHERE public_id=?').bind(id).first();if(!row){const now=Date.now();await db.prepare('INSERT OR IGNORE INTO world252_saves(public_id,revision,state_json,updated_at) VALUES(?,0,?,?)').bind(id,JSON.stringify(initial(randomToken())),now).run();row=await db.prepare('SELECT revision,state_json,updated_at FROM world252_saves WHERE public_id=?').bind(id).first();}const game=JSON.parse(row.state_json);if(game.schemaVersion!==SCHEMA)throw Error('schema');return{row,game};}
function reply(saved,shared){return{ok:true,revision:saved.row.revision,savedAt:saved.row.updated_at,...view(saved.game,shared)};}
export async function onRequest({request,env}){try{
 const session=await requireGate(request,env),db=env.RPG_SUPPORT,id=session.public_id,shared=await sharedFor(env,id);
 if(request.method==='GET')return json(reply(await state(db,id),shared));
 if(request.method!=='POST')return json({error:'method'},405);
 if(!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf)return json({error:'csrf'},403);
 const d=await readBody(request,4096);if(!d||typeof d.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(d.requestId)||!Number.isSafeInteger(d.revision)||d.revision<0||!d.command)throw Error('invalid');
 const payloadHash=await hash(JSON.stringify({revision:d.revision,command:d.command})),prior=await db.prepare('SELECT payload_hash FROM world252_ops WHERE public_id=? AND request_id=?').bind(id,d.requestId).first();
 if(prior){if(prior.payload_hash!==payloadHash)throw Error('conflict');return json({...reply(await state(db,id),shared),replayed:true});}
 const saved=await state(db,id);if(saved.row.revision!==d.revision)throw Error('conflict');const next=reduce(saved.game,d.command,shared,Date.now()),now=Date.now();
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO world252_ops(public_id,request_id,payload_hash,revision,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM world252_saves WHERE public_id=? AND revision=?)').bind(id,d.requestId,payloadHash,d.revision+1,now,id,d.revision),
  db.prepare('UPDATE world252_saves SET state_json=?,revision=revision+1,updated_at=? WHERE public_id=? AND revision=? AND EXISTS(SELECT 1 FROM world252_ops WHERE public_id=? AND request_id=? AND payload_hash=?)').bind(JSON.stringify(next),now,id,d.revision,id,d.requestId,payloadHash)
 ]);
 const receipt=await db.prepare('SELECT payload_hash FROM world252_ops WHERE public_id=? AND request_id=?').bind(id,d.requestId).first();if(!receipt||receipt.payload_hash!==payloadHash)throw Error('conflict');return json(reply(await state(db,id),shared));
 }catch(e){const known=['login_required','owner_only','test_password_required','sync_required','schema','conflict','invalid','blocked','too_far','not_ready','no_potion','boss_confirm','battle_active','no_item','create_first','materials','town_only','safe_place','unvisited','locked_item'];return json({error:known.includes(e.message)?e.message:'unavailable'},statusFor(e));}}
