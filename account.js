(() => {'use strict';const $=id=>document.getElementById(id);let csrf='',busy=false,checking=false;const fmt=n=>new Intl.NumberFormat('ja-JP').format(n);
 let displayedLook='',lookGeneration=0,lookLoading=false;
 function welcome(saved){
   $('welcomeTitle').textContent=saved?'あなたのキャラ':saved===false?'まずは自分のキャラを作ろう':'キャラ作成';
   $('welcomeText').textContent=saved?'冒険で使う外見をいつでも変更できます。':'柚の世界で使う自分の姿を選べます。';
   $('welcomeCharacter').textContent=saved?'🎨 外見を変更する':saved===false?'🎨 キャラを作る':'🎨 キャラ作成へ';
 }
 async function accountLook(sessionKey,profileId){
   if(displayedLook===sessionKey||lookLoading)return;
   const gen=++lookGeneration;
   lookLoading=true;
   try{
     const r=await fetch('api/rpg-character',{cache:'no-store',signal:AbortSignal.timeout(12000)});
     if(!r.ok)return;
     const d=await r.json();
     if(gen!==lookGeneration||(profileId&&d.id!==profileId))return;
     welcome(d.saved);
     displayedLook=sessionKey;
     const {portrait}=await import('./rpg-portrait.js?v=295');
     if(gen===lookGeneration)$('myLook').replaceChildren(portrait(d.look));
   }catch{ /* The link is available while the preview is unavailable. */ }
   finally{if(gen===lookGeneration)lookLoading=false;}
 }
 window.addEventListener('pageshow',e=>{if(e.persisted){lookGeneration++;lookLoading=false;displayedLook='';check();}});
 function loggedOut(){lookGeneration++;lookLoading=false;displayedLook='';welcome();$('accountHero').hidden=false;retry.hidden=false;$('myLook').replaceChildren();document.dispatchEvent(new CustomEvent('yuzu-account',{detail:{id:null}}));csrf='';$('myPanel').hidden=true;$('loginPanel').hidden=false;$('myName').textContent='';$('myMetrics').replaceChildren();$('mySummary').textContent='';$('myJob').textContent='';$('myUpdated').textContent='';}
 function draw(d){if(!d.authenticated){loggedOut();$('accountStatus').textContent='秘密のパスを入力してください。';return;}if(csrf!==d.csrf){lookGeneration++;lookLoading=false;displayedLook='';welcome();$('myLook').replaceChildren();}csrf=d.csrf;$('accountHero').hidden=true;retry.hidden=true;document.dispatchEvent(new CustomEvent('yuzu-account',{detail:{id:d.profile?.id||null}}));$('loginPanel').hidden=true;$('myPanel').hidden=false;const p=d.profile;accountLook(csrf,p?.id);if(!p){$('myName').textContent='ログイン済み';$('myMetrics').replaceChildren();$('mySummary').textContent='配信側の次回同期を待っています。';$('myJob').textContent='';$('myUpdated').textContent='';$('accountStatus').textContent='ログインしています。';return;}$('myName').textContent=p.name;$('mySummary').textContent='Lv.'+p.level+' '+p.rank+' / 称号：'+(p.title||'なし');const dl=document.createElement('dl');for(const [name,value]of [['累計EXP',fmt(p.exp)],['🪙柚コイン',fmt(p.coin)],['ボス攻撃力',p.attack],['冒険職',p.job],['冒険参加',fmt(p.adventures)],['冒険踏破',fmt(p.returns)],['ボス討伐',fmt(p.bossKills)],['対人戦',p.wins+'勝 '+p.losses+'敗 '+p.draws+'分'],['救助成功',fmt(p.rescues)]]){const box=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;box.append(dt,dd);dl.append(box);}$('myMetrics').replaceChildren(dl);$('myJob').textContent='冒険能力：'+p.jobStats;$('myUpdated').textContent='配信データ：'+new Date(d.capturedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+'（日本時間）';$('accountStatus').textContent='ログイン中です。';}
 async function api(action,method='GET',body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);try{const r=await fetch('api/rpg-account?action='+action,{method,cache:'no-store',credentials:'same-origin',signal:c.signal,headers:method==='POST'?{'Content-Type':'application/json','X-RPG-CSRF':csrf}:{},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();if(!r.ok){const e=Error(d.error||'unavailable');e.status=r.status;throw e;}return d;}finally{clearTimeout(timer);}}
 async function check(){if(checking||busy)return;checking=true;try{draw(await api('me'));}catch{loggedOut();$('accountStatus').textContent='ログイン状態を確認できません。「ログイン状態を再確認」を押してください。';}finally{checking=false;}}
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(busy||checking)return;busy=true;$('loginSubmit').disabled=true;let pass=$('secretPass').value.trim();$('secretPass').value='';$('secretPass').type='password';$('showPass').textContent='パスを表示する';$('showPass').setAttribute('aria-pressed','false');try{await api('login','POST',{pass});draw(await api('me'));if(csrf)$('welcomeCharacter').focus();}catch(error){$('accountStatus').textContent=error.status===401?'秘密のパスを確認してください。再発行・利用停止については配信主へお問い合わせください。':error.status===429?'入力回数の上限です。15分ほど待ってからお試しください。':error.message==='login_not_configured'?'ログイン機能は準備中です。':'通信を確認できません。ログイン状態を再確認してください。';}finally{pass='';busy=false;$('loginSubmit').disabled=false;}});
 $('logout').onclick=async()=>{if(busy||checking)return;busy=true;$('logout').disabled=true;try{await api('logout','POST',{});loggedOut();$('accountStatus').textContent='ログアウトしました。';}catch{$('accountStatus').textContent='ログアウトを確認できません。もう一度お試しください。';}finally{busy=false;$('logout').disabled=false;}};
 $('showPass').onclick=()=>{const show=$('secretPass').type==='password';$('secretPass').type=show?'text':'password';$('showPass').textContent=show?'パスを隠す':'パスを表示する';$('showPass').setAttribute('aria-pressed',String(show));};
 const retry=document.createElement('button');retry.textContent='ログイン状態を再確認';retry.onclick=check;$('accountStatus').after(retry);check();setInterval(()=>{if(!document.hidden&&csrf)check();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});})();
