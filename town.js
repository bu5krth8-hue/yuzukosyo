(() => {
  'use strict';
  const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('ja-JP').format(n);
  const svgNS='http://www.w3.org/2000/svg';
  let current=null,night=false,busy=false,peopleFocus=false;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  const samples=[{level:1,inn:0,smith:0,lab:0},{level:20,inn:3,smith:2,lab:1},{level:176,inn:5,smith:5,lab:5}];
  function sample(i){const s=samples[i],sampleExp=60*s.level*(s.level-1)+s.level*48,legacyLevel=Math.floor((1+Math.sqrt(1+4*sampleExp/15))/2),population=3+(legacyLevel-1)*20;return {schema:1,capturedAt:new Date().toISOString(),town:{level:s.level,population,exp:60*s.level*(s.level-1)+s.level*48,progress:s.level*48,required:s.level*120,tier:['小さな集落','学術都市','王都'][i],stage:[1,11,20][i]},resources:{wood:[0,95,1600][i],ore:[0,40,980][i],crystal:[0,4,240][i]},facilities:{inn:s.inn,smith:s.smith,lab:s.lab},residents:[{arrived:population>=40},{arrived:population>=100},{arrived:population>=180}],quest:{name:['木材集め','鉱石集め','魔物調査'][i],progress:[0,2,1][i],goal:[6,4,3][i]},pending:false};}
  function house(x,y,scale,color,kind='house') {
    const roof=kind==='lab'?'#756e99':kind==='smith'?'#775e59':'#a76d61';
    let body=`<path d="M-24 0V-37L0-54 24-37V0Z" fill="${color}"/><path d="M-30-35 0-60 30-35 25-29 0-49-25-29Z" fill="${roof}"/><path d="M-5 0v-19q5-7 10 0V0" fill="#634f51"/><path d="M-17-29h8v10h-8zm26 0h8v10H9z" fill="${night?'#f6cc80':'#cfb890'}"/><path d="M-20-8h10m20 0h10" stroke="#7a6a5c" stroke-opacity=".3"/>`;
    if(kind==='inn')body+=`<path d="M-21-4V-42M21-4V-42M-24-13H24" stroke="#715d58" stroke-width="3"/><path d="M30-29h20v17H30z" fill="#ddbd81"/><path d="M38-25q-5 7 3 9q-4 2-7-2t4-7" fill="#6d605c"/>`;
    if(kind==='smith')body+=`<path d="M9-46v-28h11v37" fill="#8c7d6b"/><path d="M30 0v-24h25V0" fill="#8d8375"/><path d="M36 0v-15q7-8 13 0V0" fill="#ea9d5d"/><path d="M16-83q-8-12 3-21t0-24" stroke="${night?'#b2a7bf':'#eee2c6'}" stroke-width="7" fill="none" opacity=".55"/>`;
    if(kind==='lab')body+=`<path d="M-14-40v-29a14 14 0 0 1 28 0v29" fill="#aaa0b8"/><path d="M-19-70 0-100 19-70Z" fill="#797591"/><path d="M-2-99v-14h3v14" fill="#e8cb91"/><circle cx="0" cy="-60" r="8" fill="${night?'#f4d891':'#7ba6a0'}"/><path d="M0-67v14m-7-7H7" stroke="#d6c5a0" stroke-width="1.5"/>`;
    return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="3" rx="34" ry="8" fill="#26352b" opacity=".14"/>${body}</g>`;
  }
  function scene(data){
    const stage=data?.town.stage||1,pop=data?.town.population||3;const phase=stage<=2?0:stage<=6?1:stage<=12?2:stage<=24?3:stage<=50?4:5;
    const col=phase%3,row=Math.floor(phase/3),labels=['荒れた集落','復興のはじまり','街道の村','活気ある街','城壁の交易都市','柚の都'];
    let out=`<svg width="1200" height="560" viewBox="${col*512} ${row*512} 512 512" preserveAspectRatio="xMidYMid slice"><image href="assets/town-growth-279.png" width="1536" height="1024"/></svg>`;
    if(night)out+='<rect width="1200" height="560" fill="#152e57" opacity=".48"/>';
    const crowd=Math.min(24,Math.max(3,Math.round(3+Math.sqrt(Math.max(0,pop-3))*.75)));
    out+='<g class="town-crowd" aria-hidden="true">';
    for(let i=0;i<crowd;i++){const x=125+(i%8)*130,y=355+Math.floor(i/8)*67+(i%3)*9,size=peopleFocus?95:65;out+=`<g class="town-walker" style="animation-delay:-${i%9}s;animation-duration:${8+i%5}s"><svg x="${x-size/2}" y="${y-size}" width="${size}" height="${size}" viewBox="${(i%4)*443.5} ${Math.floor((i%8)/4)*443.5} 443.5 443.5"><image href="assets/town-residents-279.png" width="1774" height="887"/></svg></g>`;}
    out+='</g>';const svg=$('townScene');while(svg.children.length>2)svg.lastElementChild.remove();const group=document.createElementNS(svgNS,'g');group.innerHTML=out;svg.append(group);svg.dataset.visualPhase=phase+1;
    $('sceneTitle').textContent=(data?.town.tier||'柚の街')+'・'+labels[phase]+'・'+(night?'夜':'昼');
  }
  function render(d) {
    current=d;$('sceneEmpty').hidden=true;scene(d);
    const t=d.town;$('townTier').textContent=t.tier;$('level').textContent='Lv. '+fmt(t.level);$('population').textContent=fmt(t.population)+' 人';
    $('growthLabel').textContent=fmt(t.progress)+' / '+fmt(t.required)+' EXP';$('growthBar').max=t.required;$('growthBar').value=t.progress;
    $('sceneCaption').textContent='発展段階 '+t.stage+' / 100 ・ 風景 '+$('townScene').dataset.visualPhase+' / 6';
    for(const key of ['inn','smith','lab']){const lv=d.facilities[key];$(key+'Level').textContent=lv>0?'Lv. '+lv+' / 5':'これから発展';$(key+'Dots').replaceChildren();for(let i=0;i<5;i++){const dot=document.createElement('span');dot.className=i<lv?'on':'';$(key+'Dots').append(dot);}}
    $('innEffect').textContent='冒険中の宿屋の回復率 '+(25+2*d.facilities.inn)+'％';
    $('smithEffect').textContent='冒険で受けるダメージを最大 '+d.facilities.smith+'％軽減';
    $('labEffect').textContent='冒険のレアイベント抽選率 '+(25+2*d.facilities.lab)+'％';
    for(const key of ['wood','ore','crystal'])$(key).textContent=fmt(d.resources[key]);
    $('questName').textContent=d.quest.name;$('questProgress').textContent=d.quest.progress+' / '+d.quest.goal;$('questBar').max=d.quest.goal;$('questBar').value=d.quest.progress;
    const at=[40,100,180];d.residents.forEach((r,i)=>{const el=$('resident'+i);el.classList.toggle('absent',!r.arrived);el.querySelector('.arrival').textContent=r.arrived?'この街で暮らしています':'人口'+at[i]+'人で仲間に';});
    const date=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(d.capturedAt));
    const stale=Date.now()-Date.parse(d.capturedAt)>15*60*1000;
    $('syncStatus').textContent=(preview?'表示サンプル / ':'')+'最終同期 '+date+'（日本時間）'+(stale?' · 保存済みの街を表示中':'')+(d.pending?' · 配信側に反映待ちの記録があります':'');
  }
  function valid(d){return d?.schema===1&&Number.isSafeInteger(d.town?.level)&&d.town.level>=1&&typeof d.town.tier==='string'&&Number.isFinite(Date.parse(d.capturedAt))&&d.facilities&&d.resources&&Array.isArray(d.residents)&&d.residents.length===3&&d.quest;}
  async function load(){
    if(busy||preview)return;busy=true;$('refreshButton').disabled=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{const response=await fetch('api/rpg-town',{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});const body=await response.json();
      if(response.status===503&&!current){$('syncStatus').textContent='街データの連携準備中です。公開後の最初の同期をお待ちください。';return;}
      if(!response.ok)throw Error('unavailable');if(!body.data){$('syncStatus').textContent='街データはまだ届いていません。最初の同期をお待ちください。';return;}
      if(!valid(body.data))throw Error('invalid');render(body.data);
    }catch{$('syncStatus').textContent=current?'更新を確認できませんでした。最後に取得した街を表示しています。':'街の記録を取得できませんでした。しばらくしてから更新してください。';}
    finally{clearTimeout(timeout);busy=false;$('refreshButton').disabled=false;}
  }
  $('peopleButton').addEventListener('click',()=>{peopleFocus=!peopleFocus;$('peopleButton').setAttribute('aria-pressed',String(peopleFocus));$('peopleButton').textContent=peopleFocus?'通常の大きさに戻す':'住民に注目';scene(current);});
  $('dayButton').addEventListener('click',()=>setNight(false));$('nightButton').addEventListener('click',()=>setNight(true));
  function setNight(value){night=value;$('dayButton').setAttribute('aria-pressed',String(!value));$('nightButton').setAttribute('aria-pressed',String(value));scene(current);}
  $('refreshButton').addEventListener('click',()=>{if(preview)render(current);else load();});
  scene(null);
  if(preview){$('sampleNote').hidden=false;render(sample(1));document.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>render(sample(Number(b.dataset.sample)))));}
  else{load();setInterval(()=>{if(!document.hidden)load();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}
})();
