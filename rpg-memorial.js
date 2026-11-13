const get=id=>document.getElementById(id);
const list=get('memorialList'), search=get('memorialSearch'), more=get('memorialMore'), status=get('memorialStatus');
let exhibits=[], limit=24;
const day=at=>new Date(at+32400000).toISOString().slice(0,10);
function render(){
  const query=search.value.trim().toLocaleLowerCase('ja');
  const matches=exhibits.filter(entry=>entry.name.toLocaleLowerCase('ja').includes(query));
  list.replaceChildren();
  for(const entry of matches.slice(0,limit)){
    const card=document.createElement('details');
    card.className='card memorial-exhibit';
    const title=document.createElement('summary');
    title.textContent=entry.name;
    const kills=document.createElement('p');
    kills.textContent=`討伐 ${entry.kills}回`;
    const first=document.createElement('p');
    first.textContent=entry.firstAt?`初討伐 ${day(entry.firstAt)}（日本時間）`:'初討伐日の記録なし';
    card.append(title,kills,first);
    if(entry.firstAt&&entry.articleAt===entry.firstAt){
      const link=document.createElement('a');
      link.href='newspaper.html?day='+day(entry.firstAt);
      link.textContent='初討伐日の新聞を読む →';
      card.append(link);
    }
    list.append(card);
  }
  more.hidden=matches.length<=limit;
  status.textContent=`展示 ${exhibits.length} / 500種`+(query?` ／ 検索結果 ${matches.length}件`:'');
}
async function read(url){
  const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('unavailable');
  return response.json();
}
search.addEventListener('input',()=>{limit=24;render();});
more.onclick=()=>{const previous=limit;limit+=24;render();list.children[previous]?.querySelector('summary')?.focus();};
try{
  const [catalogue,data]=await Promise.all([read('rpg-catalogue.json?v=240'),read('api/rpg-memorial')]);
  if(!data.kills)status.textContent='配信からの初回同期を待っています。';
  else{
    exhibits=catalogue.bosses.flatMap((boss,index)=>data.kills[index]>0?
      [{name:boss.name,kills:data.kills[index],firstAt:data.firsts[boss.key],articleAt:data.newspaperFirsts[boss.key]}]:[]);
    render();
  }
}catch{status.textContent='討伐記録を取得できませんでした。ページを再読み込みしてください。';}
