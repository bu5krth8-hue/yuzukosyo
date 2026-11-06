import {activityCards} from './activity-status-model.js?v=278';
import {timerRow,updateTimer} from './activity-ui.js?v=275';
const box=document.getElementById('activityStatus');let epoch=0,anchor=0,server=0,active=null;
const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
async function get(path,signal){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal});if(!r.ok)throw Error(String(r.status));return r.json();}
async function load(){if(!box||document.hidden)return;const n=++epoch;active?.abort();active=new AbortController();const current=active,signal=current.signal,t=setTimeout(()=>current.abort(),12000);try{
 const me=await get('/api/rpg-account?action=me',signal);if(n!==epoch)return;if(!me.authenticated){box.replaceChildren();return;}
 const d=await get('/api/idle-world',signal);try{const sync=await get('/api/rpg-sync-status',signal);if(sync.me===me.profile?.id)d.syncPending=sync.pending;}catch{d.syncPending=[{kind:'unknown',count:1,label:'配信への反映状況を確認できません'}];}const check=await get('/api/rpg-account?action=me',signal);if(n!==epoch)return;if(!check.authenticated||check.profile?.id!==me.profile?.id){box.replaceChildren();return;}
 server=d.now;anchor=performance.now();box.replaceChildren(el('h2','いまの活動'));for(const c of activityCards(d)){const a=el('a','');a.href=c.href;a.className='activity-status-card';a.append(el('strong',c.title),el('p',c.text));if(c.start!=null)a.append(timerRow(c.start,c.end,server,'経過',c.kind));a.append(el('span',c.href.endsWith('#shop')?'購入・転職を確認する →':'活動を確認する →'));a.onclick=()=>{if(c.href.endsWith('#legacyStatus')){const panel=document.getElementById('legacyStatus');if(panel)panel.open=true;}};box.append(a);}
 }catch{if(n===epoch){box.replaceChildren(el('p','活動を確認できません。'));const a=el('a','オート冒険で確認する →');a.href='/idle-world#activities';box.append(a);}}finally{clearTimeout(t);}}
document.addEventListener('yuzu-account',e=>{if(!e.detail?.id){epoch++;active?.abort();box?.replaceChildren();}else load();});
document.addEventListener('yuzu-activity-refresh',load);document.addEventListener('visibilitychange',()=>{if(document.hidden){epoch++;active?.abort();box?.replaceChildren();}else load();});
setInterval(()=>{if(!document.hidden)box?.querySelectorAll('[data-activity-start]').forEach(e=>updateTimer(e,server+performance.now()-anchor));},1000);setInterval(load,60000);load();
