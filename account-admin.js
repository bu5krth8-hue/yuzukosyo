(() => {'use strict';
 const $=id=>document.getElementById(id);let key='',players=[],credentials=[],busy=false,page=0,epoch=0;
 const emergency=action=>action==='disable'||action==='logout_all';
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 function secretsText(){return credentials.map(p=>'【'+p.name+' さん用 / @'+p.login+'】\nログイン先：https://yuzukosyo.pages.dev/account.html\n秘密のパス：'+p.pass+'\n他の方へ渡さないでください。').join('\n\n────────────────\n\n');}
 function draw(){
  const q=$('accountSearch').value.trim().replace(/^@/,'').toLowerCase(),list=players.filter(p=>p.name.toLowerCase().includes(q)||(p.login||'').toLowerCase().includes(q));page=Math.min(page,Math.max(0,Math.ceil(list.length/30)-1));
  $('accountCounts').textContent=players.length+'人 / 未発行 '+players.filter(p=>!p.issued).length+'人 / 停止中 '+players.filter(p=>p.issued&&!p.active).length+'人';$('accountList').replaceChildren();
  for(const p of list.slice(page*30,(page+1)*30)){
   const row=node('article'),who=node('div'),actions=node('div');row.className='account-row';actions.className='actions';
   who.append(node('h3',p.name),node('p',p.orphan?'現在の配信同期一覧にはいません':('Lv.'+p.level+' / '+p.job)),node('p',p.login?'Twitch英語ID：@'+p.login:'英語ID未同期（発行・再発行は保留）'),node('small',!p.issued?'未発行':p.active?'利用可能':'利用停止中'));
   const specs=p.issued?[...(!p.orphan?[['rotate','パス再発行']]:[]),['logout_all','全端末ログアウト'],[p.active?'disable':'enable',p.active?'利用停止':'利用再開']]:[['issue','パス発行']];
   for(const [action,label] of specs){const b=node('button',label);b.disabled=busy||(credentials.length>0&&!emergency(action))||((action==='issue'||action==='rotate')&&!p.login);b.onclick=async()=>{if(action!=='issue'&&!confirm(p.name+'：'+label+'を実行しますか？'+(action==='rotate'?'古いパスと全端末のログインが無効になります。':'')))return;await mutate({action,id:p.id,...(p.issued?{version:p.version}:{})});};actions.append(b);}
   row.append(who,actions);$('accountList').append(row);
  }
  $('pendingNotice').textContent=credentials.length?'発行したパスの保存待ちです。上の「今回発行した秘密のパス」を保存し、確認チェック→「パスの表示を消す」で次の発行へ進めます。利用停止・全端末ログアウトは保存待ちでも操作できます。':'';
  $('issueMissing').disabled=busy||credentials.length>0;$('reload').disabled=busy;$('disconnect').disabled=busy||credentials.length>0;$('accountPager').replaceChildren();const max=Math.ceil(list.length/30);
  if(max>1){const prev=node('button','← 前へ'),next=node('button','次へ →');prev.disabled=page===0;next.disabled=page+1>=max;prev.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};$('accountPager').append(prev,node('span',(page+1)+' / '+max),next);}
 }
 async function api(body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000),ticket=epoch,auth=key;try{const r=await fetch('api/rpg-account-admin',{method:body?'POST':'GET',cache:'no-store',signal:c.signal,headers:{Authorization:'Bearer '+auth,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(ticket!==epoch)throw Error('view_closed');if(!r.ok||!d.ok){const e=Error(d.error||'unavailable');e.status=r.status;throw e;}return d;}finally{clearTimeout(timer);}}
 async function reload(){const d=await api();players=[...d.players,...d.orphaned.map(p=>({...p,name:'同期一覧外：'+p.id.slice(0,12),issued:true,orphan:true}))];$('management').hidden=false;$('adminLogin').hidden=true;draw();}
 function operationError(e){return e.status===401?'認証できません。管理画面を閉じてキーを確認してください。':e.message==='identity_sync_required'?'配布先の英語IDが未同期です。情報同期コードの実行を確認してください。':e.message==='already_issued'?'すでに発行されています。一覧を更新してください。':e.message==='account_changed'?'別の操作でアカウントが更新されました。一覧を更新し、状態を確認してから操作してください。':e.message==='version_required'?'管理ページをCtrl＋F5で再読み込みしてください。表示中のパスがあれば先に保存してください。':'結果を確認できません。一覧を更新してください。発行済みでパスを受け取れなかった場合は再発行します。';}
 async function mutate(body){
  if(busy||(credentials.length&&!emergency(body.action)))return;const ticket=epoch;busy=true;draw();
  try{
   const d=await api(body);if(d.credentials?.length){credentials=d.credentials;$('credentials').textContent=secretsText();$('credentialPanel').hidden=false;$('savedPasses').checked=false;$('clearPasses').disabled=true;$('credentialPanel').scrollIntoView?.({block:'start',behavior:'smooth'});}
   const message=d.credentials?.length?d.credentials.length+'人分のパスを発行しました。保存して本人へ個別に渡してください。':body.action==='issue_missing'?'発行できる未発行の人はいません。英語IDの同期も確認してください。':'変更を保存しました。';$('adminStatus').textContent=message;
   try{await reload();}catch(e){if(ticket===epoch)$('adminStatus').textContent=message+' 一覧の再取得だけに失敗しました。'+(credentials.length?'表示中のパスを先に保存してください。':'「一覧を更新」で確認してください。');}
  }catch(e){if(ticket===epoch)$('adminStatus').textContent=operationError(e);}finally{if(ticket===epoch){busy=false;draw();}}
 }
 function closeManagement(message){epoch++;key='';players=[];credentials=[];page=0;busy=false;$('adminKey').value='';$('credentials').textContent='';$('credentialPanel').hidden=true;$('savedPasses').checked=false;$('clearPasses').disabled=true;$('accountList').replaceChildren();$('management').hidden=true;$('adminLogin').hidden=false;$('connect').disabled=false;$('pendingNotice').textContent='';$('adminStatus').textContent=message;}
 $('adminLogin').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const ticket=epoch;key=$('adminKey').value.trim();$('adminKey').value='';busy=true;$('connect').disabled=true;try{await reload();$('adminStatus').textContent='管理画面を開きました。';}catch(e){if(ticket===epoch){key='';$('adminStatus').textContent=e.status===401?'管理専用トークンを確認してください。':e.message==='snapshot_required'?'RPG情報の初回同期を待っています。':'接続できません。管理用Secretと追加SQLを確認してください。';}}finally{if(ticket===epoch){busy=false;$('connect').disabled=false;draw();}}});
 $('reload').onclick=async()=>{if(busy)return;const ticket=epoch;busy=true;draw();try{await reload();$('adminStatus').textContent=credentials.length?'一覧を更新しました。発行したパスを保存してください。':'一覧を更新しました。';}catch(e){if(ticket===epoch)$('adminStatus').textContent='一覧を更新できませんでした。';}finally{if(ticket===epoch){busy=false;draw();}}};
 $('issueMissing').onclick=()=>mutate({action:'issue_missing'});$('accountSearch').addEventListener('input',()=>{page=0;draw();});
 $('savedPasses').onchange=()=>{$('clearPasses').disabled=!$('savedPasses').checked;};$('clearPasses').onclick=()=>{if(!$('savedPasses').checked)return;credentials=[];$('credentials').textContent='';$('credentialPanel').hidden=true;draw();};
 $('downloadPasses').onclick=()=>{if(!credentials.length)return;const url=URL.createObjectURL(new Blob(['\ufeff'+secretsText()],{type:'text/plain;charset=utf-8'})),a=node('a');a.href=url;a.download='柚RPG_秘密のパス_本人配布用.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('disconnect').onclick=()=>closeManagement('管理画面を閉じました。');
 window.addEventListener('pagehide',()=>closeManagement('ページ移動により管理画面を閉じました。管理専用トークンで開き直してください。'));
 window.addEventListener('pageshow',e=>{if(e.persisted&&!key)closeManagement('管理専用トークンで開き直してください。');});
})();
