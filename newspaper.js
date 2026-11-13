import {portrait} from './rpg-portrait.js?v=295';
import {setupImageExport} from './newspaper-image.js?v=287';

const $=id=>document.getElementById(id),LABEL={boss:'討伐の知らせ',rescue:'救出の知らせ',town:'街の発展',adventure:'冒険の記録',pvp:'対人戦'};
const today=()=>new Date(Date.now()+32400000).toISOString().slice(0,10),time=at=>new Date(at).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'});
let nemesis=null,data=null,captured=0,busy=false,failed=false,nextRefresh=0,delay=60000,selected=/^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get('day')||'')?new URLSearchParams(location.search).get('day'):today();
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function allForDay(){return(data?.events||[]).filter(e=>e.day===selected).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));}
const sections={boss:'ボスモンスター討伐',rescue:'救助',adventure:'冒険',pvp:'対人戦',town:'街の発展'};
function grouped(stories){
  return Object.keys(sections).flatMap(kind=>stories.filter(story=>story.kind===kind));
}
function visible(){const q=$('search').value.trim().toLocaleLowerCase('ja'),kind=$('kind').value;return allForDay().filter(e=>(!kind||e.kind===kind)&&(!q||[e.headline,e.text,...e.names].join(' ').toLocaleLowerCase('ja').includes(q)));}
function renderNemesis(){
 const box=$('nemesisActive');box.replaceChildren();const r=nemesis?.active;if(r){const badge=Date.now()-captured>180000?'前回の同期時点の記録':nemesis.status==='encounter'?'再び出現中':'再会を待つ宿敵';box.append(element('span',badge,'nemesis-badge'),element('h3',r.name));const stats=element('div',undefined,'nemesis-stats');stats.append(element('span','遭遇 '+r.encounters+'回'),element('span','逃走 '+r.escapes+'回'),element('span','前回の残りHP '+r.lastRemaining+' / '+r.maxHp));box.append(stats,element('p','初遭遇 '+new Date(r.firstAt).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'})+' ／ 因縁は配信をまたいで続きます。'));}else box.append(element('p',nemesis?'現在、追跡中の宿敵はいません。1人以上が攻撃した通常のボス戦で逃した相手が、宿敵として記録されます。':'宿敵の記録は、配信側からの最初の同期後に表示されます。')); 
 $('nemesisHistory').replaceChildren(...(nemesis?.history||[]).map(r=>element('li',r.name+' ／ '+r.encounters+'戦・逃走'+r.escapes+'回を経て討伐'+(r.killer?' ／ 最後の一撃：'+r.killer:''))));$('nemesisArchive').hidden=!nemesis?.history?.length;
}
function render(){renderNemesis();
 const dates=[...new Set([today(),selected,...(data?.events||[]).map(e=>e.day)])].sort().reverse();$('day').replaceChildren(...dates.map(day=>{const o=element('option',day.replaceAll('-',' / ')+(day===today()?'　今日':''));o.value=day;return o;}));$('day').value=selected;$('issueDate').textContent=selected.replaceAll('-',' / ')+'　日本時間';
 for(const kind of ['boss','rescue','town'])$(kind+'Count').textContent=String(allForDay().filter(e=>e.kind===kind).length);
 const stories=grouped(visible());$('saveImage').disabled=stories.length===0;$('articles').replaceChildren();$('copy').disabled=allForDay().length===0;
 if(!stories.length){const empty=element('div',undefined,'empty');empty.append(element('h2',allForDay().length?'該当する記事がありません。':data?'この日の新聞は、まだ白紙です。':'最初の新聞を待っています。'),element('p',allForDay().length?'名前や記事の種類を変えて探してみてください。':'配信の出来事を種類ごとに、発生した順で掲載します。'));$('articles').append(empty);}
 let currentKind, section;
 for(const e of stories){
  if(currentKind!==e.kind){
    currentKind=e.kind;
    section=element('section',undefined,'news-section');
    section.append(element('h2',sections[currentKind]+'コーナー','news-section-title'));
    $('articles').append(section);
  }
const article=element('article',undefined,'story'+(e.kind==='boss'||e.kind==='rescue'?' important':'')),body=element('div'),meta=element('div',undefined,'meta'),at=element('time',time(e.at)+' 記録');at.dateTime=new Date(e.at).toISOString();meta.append(element('span',LABEL[e.kind],'tag'),at);body.append(meta,element('h2',e.headline),element('p',e.text));if(e.look){const badge=element('div',undefined,'news-portrait');badge.append(portrait(e.look),element('strong',e.featuredName+' ／ '+{boss:'討伐MVP',rescue:'救助成功',adventure:'遠征で活躍'}[e.kind]));body.append(badge);}if(e.names.length)body.append(element('p','記事に登場：'+e.names.join('・'),'people'));article.append(body);section.append(article);}
 $('status').textContent=failed?'通信を確認できませんでした。前回受信した記録は保持しています。「最新の記録へ」で再試行できます。':captured?`最終同期 ${new Date(captured).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}（日本時間）${Date.now()-captured>600000?' ／ 新しい同期を待っています。':' ／ 出来事は約1分を目安に反映します。'}`:'最初の同期を待っています。';
}
async function refresh(force=false){if(busy||document.hidden||(!force&&Date.now()<nextRefresh))return;busy=true;$('refresh').disabled=true;const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);try{const r=await fetch('api/newspaper',{cache:'no-store',signal:abort.signal});if(r.status===429){
 const retry=r.headers.get('Retry-After'),seconds=retry?Number(retry):NaN;
 const wait=Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-Date.now();
 delay=Math.max(120000,Math.min(900000,wait||delay*2));throw Error('rate_limit');
 }if(!r.ok)throw Error('network');const body=await r.json();if(body.data!==null&&(body.data?.schema!==1||!Array.isArray(body.data.events)))throw Error('schema');data=body.data;nemesis=body.nemesis||null;captured=Date.parse(body.capturedAt)||0;failed=false;delay=60000;}catch{failed=true;delay=Math.min(900000,Math.max(120000,delay));}finally{nextRefresh=Date.now()+delay;clearTimeout(timer);busy=false;$('refresh').disabled=false;render();}}
$('day').addEventListener('change',()=>{selected=$('day').value;render();});for(const name of ['search','kind'])$(name).addEventListener(name==='search'?'input':'change',render);$('refresh').addEventListener('click',()=>refresh(!failed));$('print').addEventListener('click',()=>window.print());
setupImageExport(() => ({
  date: selected,
  articles: grouped(visible()).map((event,index,all) => ({
    label: `${all[index-1]?.kind!==event.kind?sections[event.kind]+'コーナー　':''}${LABEL[event.kind]}　${time(event.at)} 記録`,
    headline: event.headline,
    text: event.text,
    people: event.names.length ? '記事に登場：' + event.names.join('・') : ''
  }))
}));
$('copy').addEventListener('click',async()=>{let text=`柚の新聞｜${selected}（日本時間）\n`;for(const e of grouped(allForDay())){const line=`\n・${e.headline}\n${e.text}\n`;if((text+line).length>1770){text+='\nほかの記事はホームページへ。\n';break;}text+=line;}text+='\nhttps://yuzukosyo.pages.dev/newspaper.html?day='+selected;try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='コピーしました（2,000文字以内）。';}catch{$('copyStatus').textContent='コピーできませんでした。ブラウザの権限を確認してください。';}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},60000);refresh();
