(() => {
 'use strict';const $=id=>document.getElementById(id);if(!$('supportButton'))return;
 let busy=false,csrf='',currentDay='',pending=null;
 const preview=new URLSearchParams(location.search).get('preview')==='1',format=n=>new Intl.NumberFormat('ja-JP').format(n);
 function draw(d){
  if(d.dailyLimit!==10||!Number.isInteger(d.remaining)||!Number.isInteger(d.mineCount))throw Error('version');
  csrf=d.csrf;currentDay=d.day;
  if(pending&&(pending.day!==d.day||d.requestSeen))pending=null;
  $('supportToday').textContent=format(d.today)+' 件';$('supportTotal').textContent=format(d.total)+' EXP';$('supportPending').textContent=format(d.pending)+' EXP';$('supportMine').textContent=d.mineCount+' / 10 回';
  const done=d.remaining===0;$('supportButton').disabled=done;
  $('supportButton').textContent=done?'今日の10回分は支援済み':pending?'前回の支援を再確認する':'街を支援する ＋1 EXP（あと'+d.remaining+'回）';
  const result=d.minePending>0?'あなたの支援'+d.minePending+'回分は、配信側への反映待ちです。':d.mineCount>0?'あなたの支援は、配信側の街に反映されました。':'1回につき街EXP＋1。';
  $('supportStatus').textContent=(done?'今日も支援ありがとうございます。':result+' 今日の残りは'+d.remaining+'回。')+' 日本時間0時に回数がリセットされます。';
 }
 async function request(post=false){
  if(busy||preview)return;busy=true;$('supportButton').disabled=true;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   if(post&&!pending)pending={id:crypto.randomUUID(),day:currentDay};
   const headers={...(post?{'X-Town-CSRF':csrf}:{}),...(pending?{'X-Town-Request':pending.id}:{})};
   const r=await fetch('api/town-support',{method:post?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers});const d=await r.json();
   if(!r.ok||!d.configured){if(post&&r.status===401)csrf='';throw Error(d.error||'unavailable');}
   draw(d);
   if(post){$('supportCard').classList.remove('support-celebrate');void $('supportCard').offsetWidth;$('supportCard').classList.add('support-celebrate');}
  }catch{
   $('supportStatus').textContent=post?'受付結果を確認できませんでした。「状況を確認する」で確認してください。同じ送信の再試行で回数は増えません。':'支援機能は準備中、または一時的に確認できません。';$('supportButton').disabled=true;
  }finally{clearTimeout(timer);busy=false;}
 }
 $('supportButton').addEventListener('click',()=>{if(csrf)request(true);});$('supportRefresh').addEventListener('click',()=>request());
 if(preview){$('supportStatus').textContent='表示サンプルのため支援は送信されません。';$('supportButton').disabled=true;return;}
 request();setInterval(()=>{if(!document.hidden)request();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
})();
