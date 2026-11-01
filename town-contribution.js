(()=>{
 const $=id=>document.getElementById(id),button=$('contributionButton'),status=$('contributionStatus');let busy=false,csrf='',available=false;
 async function request(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options,signal:controller.signal});const b=await r.json();if(!r.ok)throw Error(b.error||'unavailable');return b;}finally{clearTimeout(timer);}}
 function render(b){available=!b.contribution;button.textContent=available?'今日の依頼を手伝う':'今日は貢献済み';status.textContent=!b.contribution?'1日1回、依頼の進捗を＋1できます。':b.contribution.status==='applied'?'今日の貢献は配信側へ反映済みです。街の表示は次回の更新で確認できます。':b.contribution.status==='rejected'?'貢献を反映できませんでした。配信者へお知らせください。':'今日の貢献を受け付けました。配信側への反映を待っています。';}
 async function load(submit=false){if(busy)return;busy=true;button.disabled=true;$('contributionRefresh').disabled=true;available=false;try{
  const me=await request('api/rpg-account?action=me');if(!me.authenticated){csrf='';$('contributionLogin').hidden=false;button.textContent='ログインが必要です';status.textContent='マイページでログインすると、毎日1回お手伝いできます。';return;}
  csrf=me.csrf;$('contributionLogin').hidden=true;
  const b=await request('api/town-contribution',submit?{method:'POST',headers:{'X-RPG-CSRF':csrf}}:{});render(b);
 }catch(e){if(e.message==='login_required'){csrf='';$('contributionLogin').hidden=false;status.textContent='ログインし直してください。';}else{status.textContent=submit?'受付結果を確認できませんでした。「状況を確認する」で再確認してください。同じ日の再送で重複しません。':'受付状況を取得できませんでした。「状況を確認する」で再試行できます。';}button.textContent='受付状況を確認してください';}
 finally{busy=false;button.disabled=!available;$('contributionRefresh').disabled=false;}}
 button.addEventListener('click',()=>load(true));$('contributionRefresh').addEventListener('click',()=>load());
 if(new URLSearchParams(location.search).has('preview')){button.textContent='プレビュー中';status.textContent='プレビューでは貢献を受け付けません。';return;}
 load();setInterval(()=>{if(!document.hidden)load();},60000);window.addEventListener('pageshow',()=>load());
})();
