export const ALLIES=[
 {id:'sena',name:'セナ',role:'道案内',at:0,type:'guard',note:'帰り道を守る案内人。防御と安全な撤退を支えます。'},
 {id:'rine',name:'リネ',role:'森の調査員',at:6,type:'magic',note:'霧や魔力の変化を見抜く調査員。霊体に強い魔法を使います。'},
 {id:'row',name:'ロウ',role:'鍛冶職人',at:16,type:'physical',note:'旅人の道具を直す職人。堅い装甲を砕きます。'},
 {id:'yui',name:'ユイ',role:'記録官',at:36,type:'heal',note:'消えそうな記憶をつなぐ記録官。傷ついた仲間を支えます。'},
 {id:'noa',name:'ノア',role:'配達人',at:64,type:'swift',note:'帰ってこなかった手紙を届ける配達人。素早い攻撃が得意です。'},
 {id:'towa',name:'トワ',role:'庭師',at:96,type:'heal',note:'失われた土地の種を育てる庭師。回復と採集が得意です。'}
];
export const ROUTES=[
 {id:0,name:'木漏れ日の街道',at:0,danger:1,kind:'獣',monsters:['若葉スライム','街道コボルト','木陰の牙狼'],boss:'古道を守る大牙狼'},
 {id:1,name:'瑠璃水の渓谷',at:8,danger:2,kind:'水',monsters:['水鏡クラゲ','渓流リザード','青甲ヤドカリ'],boss:'深潭の甲殻王'},
 {id:2,name:'静寂の鉱洞',at:16,danger:3,kind:'装甲',monsters:['鉱洞コウモリ','鉄鱗トカゲ','空洞の石兵'],boss:'地底の鐘守'},
 {id:3,name:'白霧の古城',at:36,danger:4,kind:'霊体',monsters:['書架の亡霊','古城の影騎士','霧灯の魔女'],boss:'名を失った城主'},
 {id:4,name:'星降りの遺跡',at:64,danger:5,kind:'魔法',monsters:['星砂の使い魔','遺跡の魔導兵','月影の梟'],boss:'星図を織る番人'},
 {id:5,name:'忘却の境界',at:96,danger:6,kind:'霊体',monsters:['記憶の残響','白紙の守護者','境界の影'],boss:'帰らぬ誓いの影'}
];
export const RECIPES=[
 {id:'meal',name:'旅人のスープ',skill:'cooking',at:0,cost:{herb:2,grain:1},output:{meal:1},note:'元気が少ないとき、自動で1個だけ使って回復します。'},
 {id:'fishmeal',name:'川魚の包み焼き',skill:'cooking',at:0,cost:{fish:2,herb:1},output:{meal:2},note:'釣りの収穫を、次の旅の食事に。'},
 {id:'seed',name:'畑の種袋',skill:'crafting',at:0,cost:{herb:2},output:{seed:2},note:'畑にまくと2時間で穀物が育ちます。'},
 {id:'weapon',name:'武器の手入れ',skill:'crafting',at:0,cost:{wood:4,ore:2},gear:'weapon',note:'自動戦闘の攻撃を少し強化します。最大5段階。'},
 {id:'armor',name:'防具の仕立て',skill:'crafting',at:6,cost:{wood:3,ore:3},gear:'armor',note:'自動戦闘の防御を少し強化します。最大5段階。'},
 {id:'tool',name:'採集道具の改良',skill:'crafting',at:3,cost:{wood:3,ore:1},gear:'tool',note:'採集で得られる住まい用資材が増えます。最大5段階。'}
];
export const MATERIALS={wood:'木材',ore:'鉱石',crystal:'結晶',herb:'薬草',fish:'川魚',grain:'穀物',seed:'種袋',meal:'旅の食事'};
export const SKILLS={gather:'採集',fishing:'釣り',farming:'農業',cooking:'料理',crafting:'製作',combat:'戦闘'};
export const FURNITURE={lamp:{name:'灯り',wood:3},table:{name:'食卓',wood:4},flowers:{name:'花壇',wood:2},books:{name:'本棚',wood:5}};
export const skillLevel=xp=>Math.min(50,1+Math.floor(Math.sqrt(Math.max(0,xp)/3)));
export function weatherAt(at){const d=new Date(at+32400000),month=d.getUTCMonth()+1,season=month>=3&&month<=5?'春':month<=8&&month>=6?'夏':month<=11&&month>=9?'秋':'冬',hour=d.getUTCHours(),index=(Math.floor(at/21600000)*17+11)>>>0;return {season,weather:index%7===0?'雨':index%5===0?'曇り':'晴れ',night:hour>=19||hour<6,moon:Math.floor(at/86400000)%30,birthday:d.getUTCMonth()===6&&d.getUTCDate()===25};}
