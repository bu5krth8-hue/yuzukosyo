// Browser-game catalogue. Shared RPG job IDs and currencies are not redefined here.
export const RELEASE='v253';
export const MATERIALS={herb:'若葉の薬草',wood:'香り木',ore:'白晶鉱',fish:'銀鱗魚',spice:'星胡椒',crystal:'灯晶',scrap:'鍛冶のかけら'};
export const RECIPES=[
 {id:'soup',name:'若葉のスープ',cost:{herb:2},effect:'全員HPを35％回復',hp:.35},
 {id:'fish',name:'銀鱗魚の香草焼き',cost:{fish:1,herb:1},effect:'全員HPを50％回復・次の3戦の攻撃10％増',hp:.5,buff:'attack'},
 {id:'tea',name:'灯晶のハーブ茶',cost:{herb:1,crystal:1},effect:'全員MPを40％回復',mp:.4},
 {id:'stew',name:'星胡椒の旅鍋',cost:{fish:1,wood:1,spice:1},effect:'全員HPを70％回復・次の3戦の被害10％減',hp:.7,buff:'defense'}
];
export const REGIONS=[
 {id:'town',name:'柚の街',level:1,palette:'town',description:'旅人たちの帰る街。宿屋・鍛冶工房・ギルド。'},
 {id:'field',name:'始まりの平原',level:1,palette:'field',description:'街の東に広がる、旅立ちの草原。'},
 {id:'forest',name:'灯籠の森',level:3,palette:'forest',description:'灯を抱く巨木と、薬草の小道。',enemies:['fungus','boar','bat'],material:'wood',next:'lake'},
 {id:'quarry',name:'白晶の採掘跡',level:5,palette:'quarry',description:'廃坑の石段に、白い鉱脈が眠る。',enemies:['golem','beetle','spider'],material:'ore',next:'ruins'},
 {id:'lake',name:'薄明の鏡湖',level:7,palette:'lake',description:'雨の湖面に、星の名残が映る。',enemies:['wisp','frog','slime'],material:'fish',next:'snow'},
 {id:'ruins',name:'星読の廃庭',level:9,palette:'ruins',description:'誰もいない庭に、古い灯晶が残る。',enemies:['shade','sentinel','spider'],material:'crystal',next:'snow'},
 {id:'snow',name:'霜鐘の峠',level:12,palette:'snow',description:'遠い鐘の音と、凍った風の通り道。',enemies:['frostwolf','wisp','golem'],material:'spice'}
];
export const EXTRA_MONSTERS={
 boar:{name:'苔角イノシシ',hp:74,attack:15,defense:6,speed:9,weak:'fire',resist:'physical',form:'boar',description:'苔の角を振るう森の獣。',drop:'wood'},
 beetle:{name:'白晶カブト',hp:87,attack:13,defense:13,speed:5,weak:'wind',resist:'physical',form:'beetle',description:'鉱石をまとって身を守る。',drop:'ore'},
 wisp:{name:'薄明ウィスプ',hp:65,attack:17,defense:4,speed:15,weak:'ice',resist:'fire',form:'wisp',description:'湖と霜の境に現れる精霊。',drop:'crystal'},
 frog:{name:'鏡湖の雨蛙',hp:92,attack:16,defense:5,speed:11,weak:'fire',resist:'ice',form:'frog',description:'雨が近いと鳴き声が響く。',drop:'fish'},
 shade:{name:'廃庭の影法師',hp:104,attack:19,defense:6,speed:16,weak:'fire',resist:'physical',form:'shade',description:'壊れた石碑のそばを漂う。',drop:'crystal'},
 sentinel:{name:'星読の石衛',hp:134,attack:21,defense:14,speed:4,weak:'wind',resist:'fire',form:'sentinel',description:'忘れられた庭を守り続ける。',drop:'ore'},
 frostwolf:{name:'霜鐘の白狼',hp:125,attack:24,defense:8,speed:18,weak:'fire',resist:'ice',form:'frostwolf',description:'峠の鐘とともに遠吠えする。',drop:'spice'}
};
export const QUESTS=[
 {id:'herbalist',name:'柚寧の薬草仕込み',text:'薬草を3回採集する',metric:'gather:herb',target:3,reward:{herb:2},points:1},
 {id:'miner',name:'ロアンの鉱脈調査',text:'白晶の採掘跡を訪れる',metric:'visit:quarry',target:1,reward:{ore:3},points:1},
 {id:'angler',name:'鏡湖の釣り便り',text:'釣りで魚を3匹持ち帰る',metric:'fish',target:3,reward:{spice:2},points:1},
 {id:'cook',name:'みんなの温かな食卓',text:'料理を2回作る',metric:'cook',target:2,reward:{fish:2,herb:3},points:1},
 {id:'smith',name:'最初の鍛冶仕事',text:'装備を1回強化する',metric:'forge',target:1,reward:{scrap:4},points:1},
 {id:'trail',name:'街道の安全確認',text:'魔物を5体倒す',metric:'kills',target:5,reward:{herb:4},points:1},
 {id:'explorer',name:'灯をつなぐ旅',text:'街の外の3地域を訪れる',metric:'regions',target:3,reward:{crystal:3},points:2},
 {id:'boss',name:'洞窟からの帰還報告',text:'野生ボスを1体倒す',metric:'bosses',target:1,reward:{ore:4,crystal:2},points:2},
 {id:'bond',name:'仲間と囲む焚き火',text:'キャンプで3回休む',metric:'camps',target:3,reward:{wood:3},points:1},
 {id:'daily',name:'本日の街道巡回',text:'今日の魔物を3体倒す（日本時間の日替わり）',metric:'dailyKills',target:3,reward:{herb:2,ore:1},points:0,daily:true}
];
export const HELP=[['操作','PCはWASD・矢印、Shiftでダッシュ、E・Enterで調べる。スマホはスティックと歩く／走る切り替え。ゲームパッドは左スティックとAボタン（実機は未確認）。'],['保存と通信','移動・会話・戦闘・制作は自動保存。通信を確認できない場合は同じ操作を再確認。共有EXP・コインはテスト中、変化しません。'],['毒と鈍足','一部の敵は毒や鈍足を付与。毒は短い間HPを減らし、鈍足は仲間内の行動順を遅らせます。回復薬・回復スキルは毒を解除。防御中は新しい付与を防ぎます。戦闘が終われば解除。'],['属性とブレイク','弱点は1.5倍、耐性は0.7倍。弱点を発見すると図鑑に記録。ブレイクで敵の行動を止めます。'],['深層迷宮','最初の野生ボスを倒したら、星読の廃庭の南東へ。全40階、5階ごとにボス、10階のボス後に回復・帰還の石碑。途中の構成とボスは保存されます。'],['キャンプと料理','街と屋外で利用できます。休息はHP・MP25％回復、ゲーム内2時間経過。料理は素材を消費。ボス戦中や洞窟では利用できません。'],['鍛冶とロック','街の鍛冶メニューで制作・強化・分解。強化は最大＋5、失敗で消えません。お気に入りの品は分解不可。'],['スキルと絆','主人公の攻撃・守り・支援にポイントを振り分けます。街で無料リセット。職業別に保持。NPC仲間の絆は同行・キャンプで成長します。'],['探索と旅の石碑','訪れた屋外の石碑はメニューから移動可能。洞窟・戦闘中からの転送は不可。未探索地域の名前と敵の情報は伏せます。'],['日付と天気','世界の昼夜・天候はゲーム内時間で変化。夜だけの魔物も出現。雨は炎の威力90％、雪は氷110％。戦闘開始時の天候で固定。日替わり依頼だけはサーバーの日本時間が基準。端末の時計を変えても報酬は増えません。']];
export const HISTORY=[['v253','40階の深層迷宮、森・採掘跡・湖・廃庭・雪の峠、採集・釣り・料理・キャンプ・鍛冶、依頼・スキル成長・NPCの絆・図鑑を追加。配信主限定のままテストを拡張。'],['v252','配信主限定の入口、旅人作成、街と平原、4人戦闘、5階洞窟、野生ボス、自動保存・再開。']];
