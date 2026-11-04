import {timerRow,updateTimer,duration} from './activity-ui.js?v=263';
const $=id=>document.getElementById(id),E=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let version=0,controller,anchor=0,serverNow=0;
function clear(){version++;controller?.abort();$('myActivities').hidden=true;$('myActivityList').replaceChildren();}
async function get(path,signal){const r=await fetch(path,{cache:'no-store',credentials:'same-origin',signal});if(!r.ok)throw Error();return r.json();}
function card(title,detail,href,start,end,label){const a=E('article');a.append(E('h3',title),E('p',detail));if(Number.isFinite(start)&&Number.isFinite(end))a.append(timerRow(start,end,serverNow,label,href==='work.html'||href==='life.html'?'work':'mission'));const link=E('a','状況を確認する →');link.href=href;a.append(link);$('myActivityList').append(a);}
async function load(){clear();const mine=version;controller=new AbortController();const current=controller,signal=current.signal,timer=setTimeout(()=>current.abort(),12000);$('myActivityRefresh').disabled=true;
try{const me=await get('api/rpg-account?action=me',signal);if(!me.authenticated||!me.profile?.id)return;const id=me.profile.id;
const results=await Promise.allSettled(['api/rpg-play','api/rpg-work','api/rpg-life','rpg-catalogue.json?v=263'].map(p=>get(p,signal)));if(mine!==version)return;
const check=await get('api/rpg-account?action=me',signal);if(mine!==version||!check.authenticated||check.profile?.id!==id)return;
$('myActivities').hidden=false;let failures=0;const [p,w,l,cat]=results,regions=cat.status==='fulfilled'?cat.value.regions:[],place=n=>regions?.[n]?.name||'地域 '+(n+1);
const good=result=>result.status==='fulfilled'&&result.value.me===id;
serverNow=good(p)?p.value.now:good(w)?w.value.now:Date.now();anchor=performance.now();
if(good(p)){const d=p.value,seen=new Set();for(const m of [...d.missions,...d.supportMissions]){if(m.status!=='running'||seen.has(m.id))continue;seen.add(m.id);const companion=!d.missions.some(x=>x.id===m.id),owner=d.players.find(x=>x.id===m.owner)?.name||'仲間';card((companion?'仲間として同行：':'自分の探索：')+({solo:'冒険',party:'遠征',errand:'街の手伝い'})[m.kind],place(m.region)+(companion?' ／ '+owner+'さんに同行':'')+' ／ '+(m.ends_at<=serverNow?'帰還済み・結果の受取待ち':'探索中'),'play.html#journey',m.started_at,m.ends_at,'出発から');}if(!seen.size)card('探索は待機中','自分の冒険・街の手伝いと、仲間への同行はここに表示します。','play.html#journey');}else failures++;
if(good(w)){const d=w.value;if(d.work){const j=d.jobs.find(x=>x.id===d.work.jobId);card('仕事：'+(j?.name||d.work.jobId),(j?.job||'職業')+' ／ '+(d.work.projection.full?'8時間分で満杯・回収待ち':'勤務中')+'。転職するには、仕事ページで終了・回収してください。','work.html',d.work.cursorMs,d.work.cursorMs+28800000,'前回回収・開始から');}else card('現在は勤務していません','解放済みの仕事を選ぶと、最大8時間分まで報酬が貯まります。','work.html');}else failures++;
if(good(l)){const d=l.value;if(d.worker){if(d.worker.mature)card('子供の仕事：'+d.worker.child.name,d.worker.child.workplace+' ／ あなたの受取枠。自分の勤務とは別枠です。','life.html',d.worker.cursorMs,d.worker.cursorMs+28800000,'前回回収から');else card('子供の仕事：成長待ち','成長・就職予定：'+new Date(d.worker.workAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+'（日本時間）','life.html');}}else failures++;
$('myActivityStatus').textContent=failures?'一部の活動情報を取得できませんでした。再読み込みするか、各ページでご確認ください。':'時間はサーバーの記録から表示しています。探索と仕事は同時に進められます。';
}catch{if(mine===version){$('myActivities').hidden=false;$('myActivityStatus').textContent='活動情報を確認できません。ログイン状態を確認して、もう一度読み込んでください。';}}finally{clearTimeout(timer);if(mine===version)$('myActivityRefresh').disabled=false;}}
$('myActivityRefresh').addEventListener('click',load);document.addEventListener('yuzu-account',e=>{if(!e.detail?.id)clear();else load();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();$('myActivityRefresh').disabled=false;}else load();});
setInterval(()=>{if(!$('myActivities').hidden)document.querySelectorAll('#myActivities [data-activity-start]').forEach(e=>updateTimer(e,serverNow+performance.now()-anchor));},1000);load();
