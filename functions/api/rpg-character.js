import {currentSession} from './rpg-account.js';
import {json,sameOrigin} from './town-support.js';
import {readBody} from './rpg-info.js';
import {validateAvatar} from './rpg-residents.js';

const sprites = ['forest','knight','mage','healer'];
const colors = ['original','warm','cool','violet'];
const accessories = ['none','leaf','star','ribbon'];
const genders = ['unset','male','female','nonbinary','private'];
const characterSQL = 'SELECT c.*,p.avatar_revision,LENGTH(p.avatar)>0 AS has_image FROM web_character c LEFT JOIN web_profiles p ON p.public_id=c.public_id WHERE c.public_id=?';

function publicLook(row) {
  return {sprite:row.sprite,color:row.color,accessory:row.accessory,
    image:row.has_image?'api/rpg-character?image='+row.public_id+'&v='+row.avatar_revision:null};
}

export async function characterLook(db,id,guest=false) {
  try {
    const row = await db.prepare(characterSQL).bind(id).first();
    if (!row || (guest && !row.share_image)) return null;
    return publicLook(row);
  } catch (error) {
    if (!String(error.message).includes('no such table: web_character')) throw error;
    return null;
  }
}

export async function onRequest({request,env}) {
  const db = env.RPG_SUPPORT;
  if (!db) return json({error:'not_configured'},503);
  try {
    const session = await currentSession(request,db);
    if (!session) return json({error:'login_required'},401);
    const id = session.public_id;
    if (request.method === 'GET') {
      const imageId = new URL(request.url).searchParams.get('image');
      if (imageId !== null) {
        if (!/^[a-f0-9]{64}$/.test(imageId)) return new Response(null,{status:404});
        const row = await db.prepare(
          'SELECT p.avatar FROM web_profiles p JOIN rpg_accounts a USING(public_id) ' +
          'LEFT JOIN web_character c USING(public_id) LEFT JOIN web_random_support_settings s USING(public_id) ' +
          'WHERE p.public_id=? AND a.active=1 AND (p.public_id=? OR (c.share_image=1 AND COALESCE(s.enabled,1)=1 AND ' +
          "EXISTS(SELECT 1 FROM idle274_runs r, json_each(r.run_json,'$.guests') g WHERE r.public_id=? AND json_extract(g.value,'$.id')=p.public_id)))"
        ).bind(imageId,id,id).first();
        if (!row?.avatar) return new Response(null,{status:404});
        return new Response(Uint8Array.from(atob(row.avatar),c=>c.charCodeAt(0)),{headers:{
          'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
        }});
      }
      const row = await db.prepare(characterSQL).bind(id).first();
      const avatar = row || await db.prepare('SELECT public_id,avatar_revision,LENGTH(avatar)>0 AS has_image FROM web_profiles WHERE public_id=?').bind(id).first();
      const legacy = row ? null : await db.prepare(
        "SELECT CASE WHEN json_valid(state_json) THEN json_extract(state_json,'$.appearance.sprite') END AS sprite FROM idle270_state WHERE public_id=?"
      ).bind(id).first();
      return json({csrf:session.csrf,gender:row?.gender||'unset',shareImage:!!row?.share_image,
        look:publicLook({public_id:id,sprite:sprites[legacy?.sprite]||'forest',color:'original',accessory:'none',...avatar})});
    }
    if (request.method !== 'POST') return json({error:'method'},405);
    if (!sameOrigin(request)||request.headers.get('X-RPG-CSRF')!==session.csrf) return json({error:'csrf'},403);
    const d = await readBody(request,140000);
    if (!sprites.includes(d.sprite)||!colors.includes(d.color)||!accessories.includes(d.accessory)||
      !genders.includes(d.gender)||typeof d.shareImage!=='boolean'||(d.removeImage && d.avatar)) return json({error:'invalid'},400);
    const commands = [db.prepare(
      'INSERT INTO web_character(public_id,gender,sprite,color,accessory,share_image) VALUES(?,?,?,?,?,?) ' +
      'ON CONFLICT(public_id) DO UPDATE SET gender=excluded.gender,sprite=excluded.sprite,color=excluded.color,accessory=excluded.accessory,share_image=excluded.share_image'
    ).bind(id,d.gender,d.sprite,d.color,d.accessory,d.shareImage?1:0)];
    if (d.avatar) commands.push(db.prepare(
      'INSERT INTO web_profiles(public_id,avatar,avatar_revision,updated_at) VALUES(?,?,1,?) ' +
      'ON CONFLICT(public_id) DO UPDATE SET avatar=excluded.avatar,avatar_revision=avatar_revision+1,updated_at=excluded.updated_at'
    ).bind(id,validateAvatar(d.avatar),Date.now()));
    if (d.removeImage) commands.push(db.prepare('UPDATE web_profiles SET avatar=NULL,avatar_revision=avatar_revision+1 WHERE public_id=?').bind(id));
    await db.batch(commands);
    return json({ok:true});
  } catch (error) {
    const invalid = ['invalid_image','image_dimensions','large'].includes(error.message);
    return json({error:invalid?error.message:'character_unavailable'},invalid?400:503);
  }
}
