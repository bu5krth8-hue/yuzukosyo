import {livingAction,allCompanions,dayAt} from './idle-living.js';
import {ALLIES,ROUTES,RECIPES,FURNITURE} from './idle-content.js';
import {unlockedChapter} from './idle-engine.js';
import {CHAPTERS,FOCUS} from './idle-story.js';
export function applyAction(s,d,now){
 if(d.action==='companions'&&(!Array.isArray(d.members)||d.members.some(id=>!allCompanions(s,ALLIES).some(a=>a.id===id&&a.at<=s.ticks))))throw Error('party_locked');
 if(d.action==='daily_claim'&&s.questDay!==dayAt(now))throw Error('quest_incomplete');
 if(livingAction(s,d,now))return s;
 if(d.action==='settings'){if(!Object.hasOwn(FOCUS,d.focus)||!Number.isInteger(d.coat)||d.coat<0||d.coat>5)throw Error('invalid');s.nextFocus=d.focus;s.coat=d.coat;}
 else if(d.action==='party'){if(!Array.isArray(d.members)||d.members.length>3||new Set(d.members).size!==d.members.length||d.members.some(id=>!allCompanions(s,ALLIES).some(a=>a.id===id&&a.at<=s.ticks))||(d.target!==-1&&!ROUTES.some(r=>r.id===d.target&&r.at<=s.ticks))||typeof d.cautious!=='boolean')throw Error('party_locked');s.companions=[...d.members];s.party=d.members.filter(id=>ALLIES.some(a=>a.id===id));s.partyCustomized=true;s.target=d.target;s.cautious=d.cautious;}
 else if(d.action==='life_settings'){if(['autoFood','autoFish','autoFarm'].some(k=>typeof d[k]!=='boolean')||!Number.isInteger(d.sprite)||d.sprite<0||d.sprite>3)throw Error('invalid');for(const k of ['autoFood','autoFish','autoFarm'])s[k]=d[k];s.appearance.sprite=d.sprite;}
 else if(d.action==='build'){if(d.item==='home'){livingAction(s,{action:'construction',kind:'home'},now);}else{const f=FURNITURE[d.item];if(!f)throw Error('invalid');if(s.furniture.includes(d.item))throw Error('already_owned');if(s.wood<f.wood)throw Error('materials');s.wood-=f.wood;s.furniture.push(d.item);const occupied=new Set(s.layout.map(p=>p.y*6+p.x));const cell=Array.from({length:24},(_,i)=>i).find(i=>!occupied.has(i));s.layout.push({id:d.item,x:cell%6,y:Math.floor(cell/6),rotation:0});}}
 else if(d.action==='layout'){if(!Array.isArray(d.items)||d.items.length>s.furniture.length||new Set(d.items.map(p=>p.id)).size!==d.items.length||d.items.some(p=>!s.furniture.includes(p.id)||!Number.isInteger(p.x)||p.x<0||p.x>5||!Number.isInteger(p.y)||p.y<0||p.y>3||![0,90,180,270].includes(p.rotation))||new Set(d.items.map(p=>p.x+','+p.y)).size!==d.items.length)throw Error('layout_invalid');s.layout=d.items.map(({id,x,y,rotation})=>({id,x,y,rotation}));}
 else if(d.action==='craft'){const r=RECIPES.find(r=>r.id===d.recipe&&r.at<=s.ticks);if(!r)throw Error('recipe_locked');if(r.gear&&s.gear[r.gear]>=5)throw Error('gear_max');for(const [k,n]of Object.entries(r.cost))if((['wood','ore','crystal'].includes(k)?s[k]:s.supplies[k])<n)throw Error('materials');for(const [k,n]of Object.entries(r.cost))if(['wood','ore','crystal'].includes(k))s[k]-=n;else s.supplies[k]-=n;if(r.gear)s.gear[r.gear]++;for(const [k,n]of Object.entries(r.output||{}))s.supplies[k]+=n;s.skills[r.skill]=(s.skills[r.skill]||0)+2;}
 else if(d.action==='plant'){if(s.farm)throw Error('farm_busy');if(s.supplies.seed<1)throw Error('materials');s.supplies.seed--;s.farm={plantedAt:now,readyAt:now+7200000};}
 else if(d.action==='harvest'){if(!s.farm||now<s.farm.readyAt)throw Error('not_ready');s.supplies.grain+=3;s.skills.farming=(s.skills.farming||0)+2;s.farm=null;}
 else if(d.action==='read'){const c=CHAPTERS[d.chapter];if(!Number.isInteger(d.chapter)||!c||!unlockedChapter(s,c,d.chapter)||![0,1].includes(d.choice))throw Error('locked_chapter');if(s.read.includes(d.chapter)){if(s.choices[d.chapter]!==d.choice)throw Error('choice_saved');}else{s.read.push(d.chapter);s.choices[d.chapter]=d.choice;}}
 else if(d.action==='pet_name'){if(typeof d.name!=='string'||d.name.trim().length<1||[...d.name.trim()].length>12||/[\u0000-\u001f\u007f<>]/.test(d.name))throw Error('invalid');s.pet.name=d.name.trim();}
 else if(!['settle','favorite'].includes(d.action))throw Error('invalid');return s;
}
