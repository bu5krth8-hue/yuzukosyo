// Personal life only. No writes to shared EXP, coins, marriage or town materials.
export const PERSONALITIES={courage:'勇気',care:'慎重さ',social:'社交性',curiosity:'好奇心',confidence:'自信',calm:'安心'};
export const GARDEN={flower:{name:'季節の花壇',wood:4,ore:0,hours:1},pond:{name:'小さな池',wood:8,ore:5,hours:2},orchard:{name:'果樹',wood:6,ore:0,hours:2},fence:{name:'木の柵',wood:8,ore:1,hours:1},bench:{name:'庭のベンチ',wood:5,ore:1,hours:1},well:{name:'井戸',wood:4,ore:8,hours:3},shed:{name:'物置小屋',wood:12,ore:4,hours:4},petHouse:{name:'猫の家',wood:6,ore:2,hours:2},streetLamp:{name:'庭の街灯',wood:4,ore:4,hours:2},kitchen:{name:'屋外の台所',wood:10,ore:6,hours:3}};
export const HOUSE_STYLES={cottage:'森のコテージ',stone:'石造りの家',town:'街角の住まい'};
export const DYES=['#5f7758','#b57558','#567d9e','#b5924b','#88739d','#e1d7bd'];
const cap=n=>Math.max(0,Math.min(100,n));
export function dayAt(at){return new Date(at+32400000).toISOString().slice(0,10);}
export function livingUpgrade(s){
 if(s.livingVersion!==undefined&&s.livingVersion!==1)throw Error('save_invalid');
 if(s.livingVersion!==1){s.livingVersion=1;s.personality=Object.fromEntries(Object.keys(PERSONALITIES).map((k,i)=>[k,40+((s.seed+i*17)>>>0)%21]));s.mood={name:'穏やか',until:0};s.routine={early:false,autoHeal:true};s.injury=0;s.construction=null;s.garden=[];s.exterior={style:'cottage',roof:0,wall:5,door:1};s.blueprints=[];s.roster=[];s.companions=null;s.collection={};s.questDay='';s.daily={gather:0,win:0,social:0,claimed:[]};s.memories=[];s.celebrations=[];s.gallery=[];}
 return s;
}
export function livingValid(s){
 livingUpgrade(s);const num=n=>Number.isSafeInteger(n)&&n>=0,text=(v,n)=>typeof v==='string'&&[...v].length<=n&&!/[\u0000-\u001f\u007f<>]/.test(v);
 if(!s.personality||Object.keys(PERSONALITIES).some(k=>!num(s.personality[k])||s.personality[k]>100)||!s.mood||!text(s.mood.name,24)||!num(s.mood.until)||!s.routine||typeof s.routine.early!=='boolean'||typeof s.routine.autoHeal!=='boolean'||!num(s.injury)||s.injury>12||!Array.isArray(s.garden)||s.garden.some(k=>!GARDEN[k])||new Set(s.garden).size!==s.garden.length||!s.exterior||!HOUSE_STYLES[s.exterior.style]||['roof','wall','door'].some(k=>!Number.isInteger(s.exterior[k])||s.exterior[k]<0||s.exterior[k]>=DYES.length))throw Error('save_invalid');
 const c=s.construction;if(c&&(!['home','garden'].includes(c.kind)||c.kind==='garden'&&!GARDEN[c.item]||!num(c.startedAt)||!num(c.readyAt)||c.readyAt<=c.startedAt||c.kind==='home'&&c.to!==s.home+1))throw Error('save_invalid');
 if(!Array.isArray(s.roster)||s.roster.some(a=>!/^wanderer_[1-9][0-9]*$/.test(a.id)||!text(a.name,24)||!['guard','magic','physical','heal','swift'].includes(a.type)||!num(a.at)||a.at>s.ticks)||new Set(s.roster.map(a=>a.id)).size!==s.roster.length||s.companions!==null&&(!Array.isArray(s.companions)||s.companions.length>3||new Set(s.companions).size!==s.companions.length)||!s.collection||Object.entries(s.collection).some(([k,v])=>!/^relic_[0-9]{1,2}_[1-5]$/.test(k)||!num(v))||!Array.isArray(s.blueprints)||s.blueprints.length>5||s.blueprints.some(b=>!text(b.name,16)||!Array.isArray(b.items)||b.items.length>4||new Set(b.items.map(p=>p.id)).size!==b.items.length||new Set(b.items.map(p=>p.x+','+p.y)).size!==b.items.length||b.items.some(p=>!s.furniture.includes(p.id)||!Number.isInteger(p.x)||p.x<0||p.x>5||!Number.isInteger(p.y)||p.y<0||p.y>3||![0,90,180,270].includes(p.rotation)))||!Array.isArray(s.memories)||s.memories.length>30||!Array.isArray(s.celebrations)||s.celebrations.some(d=>!/^\d{4}-07-25$/.test(d))||!Array.isArray(s.gallery)||s.gallery.length>60||!s.daily||['gather','win','social'].some(k=>!num(s.daily[k]))||!Array.isArray(s.daily.claimed)||s.daily.claimed.some(k=>!['gather','win','social'].includes(k))||new Set(s.daily.claimed).size!==s.daily.claimed.length)throw Error('save_invalid');
 return s;
}
export function allCompanions(s,base){return [...base,...(s.journey?.guests||[]).map(g=>({...g,id:'viewer_'+g.id,at:0,role:'視聴者の分身',type:'physical',note:'同行ONの視聴者の助っ人です。'})),...s.roster.map(a=>({...a,role:{guard:'護衛',magic:'術士',physical:'剣士',heal:'癒し手',swift:'斥候'}[a.type],note:'旅の途中で出会った仲間。'}))];}
export function activeCompanions(s,base){const pool=allCompanions(s,base);return (s.companions||s.party).map(id=>pool.find(a=>a.id===id)).filter(Boolean);}
export function livingBefore(s,at,weather){
 const notes=[],detail={},day=dayAt(at),hour=new Date(at+32400000).getUTCHours();
 if(s.questDay!==day){s.questDay=day;s.daily={gather:0,win:0,social:0,claimed:[]};}
 if(s.construction&&at>=s.construction.readyAt){const c=s.construction;if(c.kind==='home')s.home=c.to;else if(!s.garden.includes(c.item))s.garden.push(c.item);notes.push(c.kind==='home'?'住まいの増築が完成しました。':'庭の「'+GARDEN[c.item].name+'」が完成しました。');detail.completed={kind:c.kind,item:c.item||'',stage:s.home};s.construction=null;}
 if(s.mood.until<=at)s.mood={name:'穏やか',until:at};
 let force=null,reason='';if(s.injury>0&&s.routine.autoHeal){force='rest';reason='けがの療養';}
 else if(s.energy<35&&s.personality.care>=60){force='rest';reason='慎重な性格で早めの休息';}
 else if(hour===(s.routine.early?21:23)||hour===(s.routine.early?5:7)){force='rest';reason=hour>=21?'自宅で就寝':'朝の身支度';}
 if(weather.birthday&&!s.celebrations.includes(day)){s.celebrations.push(day);s.crystal++;notes.push('英雄の生誕祭に参加。記念の結晶を1個受け取りました。');detail.celebration=day;}
 if(at>=s.mood.until)s.personality.calm=cap(s.personality.calm+1);
 return {notes,detail,force,reason};
}
export function chooseLivingAction(s,rng){
 const explore=35+s.personality.courage*.25+s.personality.curiosity*.2+(s.mood.name==='手応えを感じる'?8:0),social=18+s.personality.social*.25,gather=30+s.personality.care*.15,total=explore+social+gather,n=rng()*total;
 return n<explore?'explore':n<explore+social?'social':'gather';
}
export function livingAfter(s,at,kind,battle,rng,detail){
 const notes=[];
 if(kind==='rest'){s.injury=Math.max(0,s.injury-1);s.personality.calm=cap(s.personality.calm+1);if(s.furniture.includes('books')){s.personality.curiosity=cap(s.personality.curiosity+1);notes.push('本棚で読み物を楽しみました。');}if(s.garden.includes('bench'))s.energy=Math.min(100,s.energy+2);}
 if(kind==='gather'){s.daily.gather++;if(s.ticks%8===0)s.personality.curiosity=cap(s.personality.curiosity+1);}
 if(kind==='social'){s.daily.social++;s.personality.social=cap(s.personality.social+1);s.mood={name:'誰かと話せてうれしい',until:at+7200000};}
 if(battle){if(battle.outcome==='win'){s.daily.win++;s.personality.confidence=cap(s.personality.confidence+1);s.mood={name:'手応えを感じる',until:at+3600000};const rarity=battle.boss?5:rng()<.04?4:rng()<.15?3:rng()<.4?2:1,key='relic_'+battle.route+'_'+rarity;s.collection[key]=(s.collection[key]||0)+1;detail.relic={key,rarity};notes.push('探索標本（希少度'+rarity+'）を保管しました。');}else{s.injury=Math.min(12,s.injury+2);s.personality.care=cap(s.personality.care+1);s.personality.confidence=cap(s.personality.confidence-1);s.mood={name:'次は無理をしない',until:at+3600000};}}
 if(s.ticks%24===0){const serial=Math.floor(s.ticks/24),names=['灯路','風音','芽吹','星詠','雪代','月見','青葉','朝凪','夕霧','若水'],a={id:'wanderer_'+serial,name:names[(serial-1)%names.length]+'・'+serial,type:['guard','magic','physical','heal','swift'][(serial-1)%5],at:s.ticks};if(!s.roster.some(x=>x.id===a.id)){s.roster.push(a);notes.push('旅人「'+a.name+'」と知り合い、仲間の名簿に加わりました。');detail.recruit=a.id;}}
 if(detail.completed||detail.celebration||detail.recruit||battle?.boss&&battle.outcome==='win'){s.memories.push({tick:s.ticks,at,kind:detail.celebration?'celebration':detail.completed?'build':detail.recruit?'recruit':'boss',text:notes.join(' ')||(detail.celebration?'英雄の生誕祭に参加':detail.completed?'住まい・庭の工事が完成':battle?.monster+'の討伐')});s.memories=s.memories.slice(-30);}
 return notes;
}
export function livingAction(s,d,now){
 if(d.action==='routine'){if(typeof d.early!=='boolean'||typeof d.autoHeal!=='boolean')throw Error('invalid');s.routine={early:d.early,autoHeal:d.autoHeal};}
 else if(d.action==='companions'){const ids=d.members;if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length)throw Error('party_limit');s.companions=[...ids];}
 else if(d.action==='exterior'){if(!HOUSE_STYLES[d.style]||['roof','wall','door'].some(k=>!Number.isInteger(d[k])||d[k]<0||d[k]>=DYES.length))throw Error('invalid');s.exterior={style:d.style,roof:d.roof,wall:d.wall,door:d.door};}
 else if(d.action==='construction'){
  if(s.construction)throw Error('construction_busy');let wood,ore,hours;
  if(d.kind==='home'){if(s.home>=5)throw Error('max_home');wood=8*s.home;ore=3*s.home;hours=s.home;}
  else if(d.kind==='garden'&&GARDEN[d.item]){if(s.garden.includes(d.item))throw Error('already_owned');({wood,ore,hours}=GARDEN[d.item]);}else throw Error('invalid');
  if(s.wood<wood||s.ore<ore)throw Error('materials');s.wood-=wood;s.ore-=ore;s.construction={kind:d.kind,item:d.item||'',to:s.home+1,startedAt:now,readyAt:now+hours*3600000};
 }
 else if(d.action==='daily_claim'){const targets={gather:3,win:2,social:2},key=d.quest;if(!Object.hasOwn(targets,key)||s.daily[key]<targets[key])throw Error('quest_incomplete');if(s.daily.claimed.includes(key))throw Error('already_claimed');s.daily.claimed.push(key);s.wood+=2;s.supplies.herb++;}
 else if(d.action==='blueprint_save'){if(typeof d.name!=='string'||[...d.name.trim()].length<1||[...d.name.trim()].length>16||/[\u0000-\u001f<>]/.test(d.name))throw Error('invalid');const name=d.name.trim(),b={name,items:structuredClone(s.layout)};const i=s.blueprints.findIndex(x=>x.name===name);if(i<0){if(s.blueprints.length>=5)throw Error('blueprint_limit');s.blueprints.push(b);}else s.blueprints[i]=b;}
 else if(d.action==='blueprint_load'){const b=s.blueprints.find(x=>x.name===d.name);if(!b)throw Error('invalid');if(b.items.some(p=>!s.furniture.includes(p.id)))throw Error('materials');s.layout=structuredClone(b.items);}
 else return false;
 return true;
}
