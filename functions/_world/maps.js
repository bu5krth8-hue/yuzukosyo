import {campaignMap} from './campaign.js';
import {CHAPTER_MONSTERS} from '../../world-campaign.js';
import {EXTRA_MONSTERS} from '../../world-content.js';
import {regionMap,decorateMap} from './regions.js';
export function random(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
const grid=(w,h,c)=>Array.from({length:h},()=>Array(w).fill(c));
const rect=(a,x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)a[j][i]=c;};
export const walkable=t=>t!==undefined&&!['#','~','t','R'].includes(t);
export function mapFor(g){const m=campaignMap(g)||decorateMap(baseMap(g),g);for(const e of m.entities)if(e.species&&e.kind==='enemy')e.name=MONSTERS[e.species].name;return m;}
function baseMap(g){
 if(g.map==='town'){
  const a=grid(28,22,'.');rect(a,0,0,28,1,'t');rect(a,0,21,28,1,'t');rect(a,0,0,1,22,'t');rect(a,27,0,1,22,'t');rect(a,12,1,3,20,'=');rect(a,1,10,26,3,'=');rect(a,3,3,6,4,'R');rect(a,19,3,6,4,'R');rect(a,4,14,6,4,'R');rect(a,19,15,6,4,'R');rect(a,3,19,5,2,'~');rect(a,3,19,5,1,'=');
  return{key:'town',name:'柚の街',subtitle:'はじまりの広場',w:28,h:22,tiles:a.map(r=>r.join('')),spawn:{x:13,y:15},entities:[
   {id:'captain',kind:'npc',name:'ハル',role:'案内人',x:13,y:9,color:'#d7935d'},
   {id:'inn',kind:'npc',name:'柚寧',role:'宿屋の女将',x:6,y:8,color:'#ca9cce'},
   {id:'smith',kind:'npc',name:'ロアン',role:'鍛冶職人',x:22,y:8,color:'#daaa71'},
   {id:'guild',kind:'npc',name:'ミナ',role:'ギルド受付',x:10,y:16,color:'#7ebcbd'},
   {id:'monument',kind:'monument',name:'英雄の碑',x:13,y:5},
   {id:'to-field',kind:'exit',name:'始まりの平原へ',x:26,y:11,destination:'field'},
   {id:'town-chest',kind:'chest',name:'旅支度の宝箱',x:17,y:15,opened:!!g.claimed['town-chest']}],labels:[{x:6,y:3,text:'宿屋'},{x:22,y:3,text:'鍛冶工房'},{x:7,y:14,text:'ギルド'},{x:22,y:15,text:'資料館'}]};
 }
 if(g.map==='field'){
  const a=grid(34,27,'.');rect(a,0,0,34,1,'t');rect(a,0,26,34,1,'t');rect(a,0,0,1,27,'t');rect(a,33,0,1,27,'t');rect(a,1,13,32,3,'=');rect(a,28,4,3,12,'=');rect(a,8,3,7,6,'~');rect(a,11,6,7,1,'=');
  for(const[x,y]of[[5,7],[5,8],[18,4],[19,4],[21,20],[22,20],[27,22],[7,21],[16,22],[3,19]])a[y][x]='t';rect(a,26,2,7,3,'#');a[4][29]='=';
  const entities=[{id:'to-town',kind:'exit',name:'柚の街へ',x:1,y:14,destination:'town'},{id:'to-cave',kind:'cave',name:'木霊の洞窟へ',x:29,y:5},{id:'field-chest',kind:'chest',name:'街道脇の宝箱',x:21,y:17,opened:!!g.claimed['field-chest']}];
  for(const[e,x,y,type]of[['field-slime',11,14,'slime'],['field-wolf',22,12,'wolf'],['field-mushroom',25,19,'fungus']])if(!g.claimed[e])entities.push({id:e,kind:'enemy',name:MONSTERS[type].name,species:type,x,y});
  return{key:'field',name:'始まりの平原',subtitle:'木霊の洞窟を探そう',w:34,h:27,tiles:a.map(r=>r.join('')),spawn:{x:3,y:14},entities,labels:[{x:29,y:3,text:'木霊の洞窟'},{x:6,y:12,text:'← 柚の街'}]};
 }
 if(g.map!=='cave')return regionMap(g);
 if(!g.run)throw Error('invalid');const floor=g.run.floor,a=grid(27,21,'#'),rng=random(g.run.seed+':floor:'+floor),stack=[[1,1]];a[1][1]='.';
 while(stack.length){const[x,y]=stack.at(-1),next=[[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dy])=>[x+dx,y+dy]).filter(([nx,ny])=>nx>0&&ny>0&&nx<26&&ny<20&&!(nx===25&&ny===19)&&a[ny][nx]==='#');if(!next.length){stack.pop();continue;}const[nx,ny]=next[Math.floor(rng()*next.length)];a[(ny+y)/2][(nx+x)/2]='.';a[ny][nx]='.';stack.push([nx,ny]);}
 a[19][25]='.';a[19][24]='.';
 const tiles=[];for(let y=1;y<20;y++)for(let x=1;x<26;x++)if(a[y][x]==='.'&&x+y>7&&(x!==25||y!==19)&&!((g.run.depth||5)>5&&floor%10===0&&x===23&&y===19))tiles.push({x,y});for(let i=tiles.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
 const prefix=g.run.id+':'+floor,entities=[{id:prefix+':back',kind:'stairs-back',name:floor===1?'平原へ戻る':'前の階へ',x:1,y:1}];
 entities.push({id:prefix+':chest',kind:'chest',name:'洞窟の宝箱',...tiles[0],opened:!!g.claimed[prefix+':chest']});
 for(let i=0;i<2;i++){const id=prefix+':enemy:'+i,type=['bat','fungus','wolf'][(floor+i)%3];if(!g.claimed[id])entities.push({id,kind:'enemy',name:MONSTERS[type].name,species:type,...tiles[i+1]});}
 const total=g.run.depth||5,bossFloor=floor%5===0,boss=g.run.bosses?.[floor]||g.run.boss,beaten=g.run.defeatedFloors?.[floor]||g.claimed[g.run.id+':boss'+(total>5?':'+floor:'')];if(bossFloor&&!beaten&&!g.run.cleared)entities.push({id:g.run.id+':boss'+(total>5?':'+floor:''),kind:'boss',name:boss.name,species:boss.species,x:25,y:19});
 else entities.push({id:prefix+':next',kind:floor===total?'cave-finish':'stairs-next',name:floor===total?'灯を持ち帰る':'次の階へ',x:25,y:19});
 if(total>5&&floor%10===0&&beaten)entities.push({id:prefix+':camp',kind:'checkpoint',name:'深層の休息石碑',x:23,y:19});
 return{key:'cave:'+g.run.id+':'+floor,name:(g.run.depth||5)>5?'古星の深層迷宮':'木霊の洞窟',subtitle:'地下'+floor+'階 / 全'+(g.run.depth||5)+'階',w:27,h:21,tiles:a.map(r=>r.join('')),spawn:{x:1,y:1},entities,labels:[]};
}
export const MONSTERS={
 slime:{name:'若草スライム',hp:38,attack:8,defense:3,speed:4,weak:'fire',color:'#74c7a0'},
 wolf:{name:'街道の灰狼',hp:58,attack:13,defense:4,speed:12,weak:'ice',color:'#afb7c1'},
 fungus:{name:'灯茸の精',hp:47,attack:10,defense:5,speed:5,weak:'fire',color:'#d4aa75'},
 bat:{name:'青羽コウモリ',hp:42,attack:11,defense:2,speed:14,weak:'wind',color:'#939fc7'},
 spider:{name:'石糸グモ',hp:66,attack:12,defense:6,speed:10,weak:'fire',color:'#b993b0'},
 golem:{name:'苔岩の守り手',hp:85,attack:14,defense:9,speed:3,weak:'wind',color:'#8baf97'}
};
Object.assign(MONSTERS,EXTRA_MONSTERS,CHAPTER_MONSTERS);
export function chooseBoss(seed,previous){const pool=['wolf','spider','golem','fungus','boar','beetle','wisp','frog','shade','sentinel','frostwolf'].filter(x=>x!==previous),rng=random(seed+':boss'),species=pool[Math.floor(rng()*pool.length)],names={wolf:['石牙のヴァルム','月影のロウガ'],spider:['銀糸のアラクネア','岩織りのシルカ'],golem:['苔冠のグラニト','洞守りのオルガ'],fungus:['灯胞のモルカ','深緑のフンガル'],boar:['古樹のブラム','苔角のグロウ'],beetle:['白晶のバスト','硬殻のガルディ'],wisp:['宵灯のリュミエ','薄明のフィル'],frog:['鏡雨のオルネ','翠波のケロス'],shade:['廃庭のノクル','暮影のセイル'],sentinel:['星鎧のアストル','石衛のベリル'],frostwolf:['霜牙のフェンル','銀嶺のアルヴァ']};return{species,name:names[species][Math.floor(rng()*2)]};}

export function deepBosses(seed,previous){const out={},names=new Set();for(let floor=5;floor<=40;floor+=5){let b;for(let attempt=0;attempt<100;attempt++){b=chooseBoss(seed+':'+floor+':'+attempt,previous);if(!names.has(b.name))break;}names.add(b.name);previous=b.species;out[floor]=b;}return out;}
