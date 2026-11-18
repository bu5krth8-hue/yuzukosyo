import {currentSession} from './rpg-account.js';
import {snapshotGet} from './rpg-snapshot.js';
import {json} from './town-support.js';

export function validateBonds(value){
  if(!Array.isArray(value)||value.length>5000)throw Error('bonds');
  const seen=new Set();
  return value.map(pair=>{
    if(!/^[a-f0-9]{64}$/.test(pair.a)||!/^[a-f0-9]{64}$/.test(pair.b)||pair.a===pair.b||
       !Number.isInteger(pair.exp)||pair.exp<1||pair.exp>1500||
       !Array.isArray(pair.counts)||pair.counts.length!==5||
       pair.counts.some(n=>!Number.isInteger(n)||n<0||n>1000000))throw Error('bond_pair');
    const [a,b]=[pair.a,pair.b].sort(),key=a+':'+b;
    if(seen.has(key))throw Error('bond_duplicate');
    seen.add(key);
    return {a,b,exp:pair.exp,counts:pair.counts};
  });
}
export async function onRequest({request,env}){
  if(request.method!=='GET')return json({error:'method'},405);
  if(!env.RPG_SUPPORT)return json({error:'not_configured'},503);
  try{
    const session=await currentSession(request,env.RPG_SUPPORT);
    if(!session)return json({error:'login_required'},401);
    const [data,game]=await Promise.all([
      snapshotGet(env,'yuzu_rpg_bonds_private_v307'),snapshotGet(env,'yuzu_rpg_public_v1')
    ]);
    const players=new Map((game?.players||[]).map(player=>[player.id,player]));
    const pairs=(data?.pairs||[]).filter(pair=>pair.a===session.public_id||pair.b===session.public_id);
    const ids=pairs.map(pair=>pair.a===session.public_id?pair.b:pair.a);
    const looks=new Map();
    if(ids.length){
      const {results}=await env.RPG_SUPPORT.prepare(
        "SELECT c.public_id,c.sprite,c.color,c.accessory FROM web_character c JOIN rpg_accounts a USING(public_id) "+
        "WHERE a.active=1 AND c.sprite LIKE '%:public' AND c.public_id IN (SELECT value FROM json_each(?))"
      ).bind(JSON.stringify(ids)).all();
      for(const row of results)looks.set(row.public_id,{sprite:row.sprite.split(':')[0],color:row.color,accessory:row.accessory});
    }
    const thresholds=[0,100,300,700,1500],labels=['知り合い','仲間','戦友','親友','相棒'];
    return json({capturedAt:data?.capturedAt||null,pairs:pairs.map(pair=>{
      const id=pair.a===session.public_id?pair.b:pair.a;
      let level=1;while(level<5&&pair.exp>=thresholds[level])level++;
      return {id,name:players.get(id)?.name||'冒険者',look:looks.get(id)||null,exp:pair.exp,level,
        relationship:labels[level-1],next:level===5?null:thresholds[level],floor:thresholds[level-1],
        bonus:level,counts:pair.counts};
    })});
  }catch{return json({error:'storage_unavailable'},503);}
}
