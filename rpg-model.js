globalThis.YuzuRpgView=Object.freeze({
 visibleMonster(monster,seen){return seen===true?monster:{name:"？？？？",kind:"？？？？",trait:"？？？？",category:"？？？？",hp:null};},
 ranking(players,key){let last=null,rank=0;return [...players].sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name,'ja')||a.id.localeCompare(b.id)).map((p,i)=>{if(p[key]!==last){rank=i+1;last=p[key];}return {player:p,rank};});},
 belongs(monster,region,regions){return monster.region===region||(monster.region===-1&&(monster.district===-1||monster.district===regions[region].district));},
 regionStatus(world,id){return !world?'未同期':world.cleared[id]?'踏破':!world.open[id]?'未解放':world.exploration[id]===100?'ボス挑戦可':world.exploration[id]+'％';}
});
