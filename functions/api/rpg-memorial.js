import {snapshotGet} from './rpg-snapshot.js';
import {json} from './town-support.js';

export async function onRequest({request,env}){
  if(request.method!=='GET')return json({error:'method'},405);
  try{
    const [snapshot,{results}]=await Promise.all([
      snapshotGet(env,'yuzu_rpg_public_v1'),
      env.RPG_SUPPORT.prepare('SELECT boss_key,first_at FROM rpg_boss_memorial').all()
    ]);
    return json({kills:snapshot?.bossKills??null,firsts:Object.fromEntries(results.map(r=>[r.boss_key,r.first_at])),
      newspaperFirsts:Object.fromEntries((snapshot?.newspaper?.events??[])
        .filter(e=>e.kind==='boss'&&e.firstKill&&e.bossKey).map(e=>[e.bossKey,e.at]))});
  }catch{return json({error:'unavailable'},503);}
}
