import {livingAction,allCompanions,dayAt} from './idle-living.js';
import {ALLIES,ROUTES,FURNITURE} from './idle-content.js';
import {FOCUS} from './idle-activity-config.js';
export function applyAction(s,d,now){
 if(d.action==='companions'&&(!Array.isArray(d.members)||d.members.some(id=>!allCompanions(s,ALLIES).some(a=>a.id===id&&a.at<=s.ticks))))throw Error('party_locked');
 if(d.action==='daily_claim'&&s.questDay!==dayAt(now))throw Error('quest_incomplete');
 if(livingAction(s,d,now))return s;
 if(d.action==='settings'){if(!Object.hasOwn(FOCUS,d.focus)||!Number.isInteger(d.coat)||d.coat<0||d.coat>5)throw Error('invalid');s.nextFocus=d.focus;s.coat=d.coat;}
 else if(d.action==='party'){if(!Array.isArray(d.members)||d.members.length>3||new Set(d.members).size!==d.members.length||d.members.some(id=>!allCompanions(s,ALLIES).some(a=>a.id===id&&a.at<=s.ticks))||(d.target!==-1&&!ROUTES.some(r=>r.id===d.target&&r.at<=s.ticks))||typeof d.cautious!=='boolean')throw Error('party_locked');s.companions=[...d.members];s.party=d.members.filter(id=>ALLIES.some(a=>a.id===id));s.partyCustomized=true;s.target=d.target;s.cautious=d.cautious;}
 else if(d.action==='build'){if(d.item==='home'){livingAction(s,{action:'construction',kind:'home'},now);}else{const f=FURNITURE[d.item];if(!f)throw Error('invalid');if(s.furniture.includes(d.item))throw Error('already_owned');if(s.wood<f.wood)throw Error('materials');s.wood-=f.wood;s.furniture.push(d.item);const occupied=new Set(s.layout.map(p=>p.y*6+p.x));const cell=Array.from({length:24},(_,i)=>i).find(i=>!occupied.has(i));s.layout.push({id:d.item,x:cell%6,y:Math.floor(cell/6),rotation:0});}}
 else if(d.action==='layout'){if(!Array.isArray(d.items)||d.items.length>s.furniture.length||new Set(d.items.map(p=>p.id)).size!==d.items.length||d.items.some(p=>!s.furniture.includes(p.id)||!Number.isInteger(p.x)||p.x<0||p.x>5||!Number.isInteger(p.y)||p.y<0||p.y>3||![0,90,180,270].includes(p.rotation))||new Set(d.items.map(p=>p.x+','+p.y)).size!==d.items.length)throw Error('layout_invalid');s.layout=d.items.map(({id,x,y,rotation})=>({id,x,y,rotation}));}
 else if(d.action==='pet_name'){if(typeof d.name!=='string'||d.name.trim().length<1||[...d.name.trim()].length>12||/[\u0000-\u001f\u007f<>]/.test(d.name))throw Error('invalid');s.pet.name=d.name.trim();}
 else if(!['settle','favorite'].includes(d.action))throw Error('invalid');return s;
}
