(() => {
  'use strict';
  const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('ja-JP').format(n);
  const svgNS='http://www.w3.org/2000/svg';
  let current=null,night=false,busy=false;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  const samples=[{level:1,inn:0,smith:0,lab:0},{level:20,inn:3,smith:2,lab:1},{level:176,inn:5,smith:5,lab:5}];
  function sample(i){const s=samples[i],population=3+(s.level-1)*20;return {schema:1,capturedAt:new Date().toISOString(),town:{level:s.level,population,exp:15*s.level*(s.level-1)+s.level*12,progress:s.level*12,required:s.level*30,tier:['小さな集落','学術都市','王都'][i],stage:[1,11,20][i]},resources:{wood:[0,95,1600][i],ore:[0,40,980][i],crystal:[0,4,240][i]},facilities:{inn:s.inn,smith:s.smith,lab:s.lab},residents:[{arrived:population>=40},{arrived:population>=100},{arrived:population>=180}],quest:{name:['木材集め','鉱石集め','魔物調査'][i],progress:[0,2,1][i],goal:[6,4,3][i]},pending:false};}
  function house(x,y,scale,color,kind='house') {
    const roof=kind==='lab'?'#756e99':kind==='smith'?'#775e59':'#a76d61';
    let body=`<path d="M-24 0V-37L0-54 24-37V0Z" fill="${color}"/><path d="M-30-35 0-60 30-35 25-29 0-49-25-29Z" fill="${roof}"/><path d="M-5 0v-19q5-7 10 0V0" fill="#634f51"/><path d="M-17-29h8v10h-8zm26 0h8v10H9z" fill="${night?'#f6cc80':'#cfb890'}"/><path d="M-20-8h10m20 0h10" stroke="#7a6a5c" stroke-opacity=".3"/>`;
    if(kind==='inn')body+=`<path d="M-21-4V-42M21-4V-42M-24-13H24" stroke="#715d58" stroke-width="3"/><path d="M30-29h20v17H30z" fill="#ddbd81"/><path d="M38-25q-5 7 3 9q-4 2-7-2t4-7" fill="#6d605c"/>`;
    if(kind==='smith')body+=`<path d="M9-46v-28h11v37" fill="#8c7d6b"/><path d="M30 0v-24h25V0" fill="#8d8375"/><path d="M36 0v-15q7-8 13 0V0" fill="#ea9d5d"/><path d="M16-83q-8-12 3-21t0-24" stroke="${night?'#b2a7bf':'#eee2c6'}" stroke-width="7" fill="none" opacity=".55"/>`;
    if(kind==='lab')body+=`<path d="M-14-40v-29a14 14 0 0 1 28 0v29" fill="#aaa0b8"/><path d="M-19-70 0-100 19-70Z" fill="#797591"/><path d="M-2-99v-14h3v14" fill="#e8cb91"/><circle cx="0" cy="-60" r="8" fill="${night?'#f4d891':'#7ba6a0'}"/><path d="M0-67v14m-7-7H7" stroke="#d6c5a0" stroke-width="1.5"/>`;
    return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="3" rx="34" ry="8" fill="#26352b" opacity=".14"/>${body}</g>`;
  }
  function scene(data) {
    const stage=data?.town.stage||1, pop=data?.town.population||3, f=data?.facilities||{inn:0,smith:0,lab:0};
    const sky=night?['#292b49','#a29aaf']:['#b9c9b9','#f1dbad'];
    const tree=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0v-27" stroke="#716d54" stroke-width="5"/><path d="M-19-19 0-62 19-19Z" fill="${night?'#3a5d58':'#638372'}"/><path d="M-16-33 0-70 16-33Z" fill="${night?'#486963':'#76937b'}"/></g>`;
    let out=`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient><linearGradient id="grass" x2="0" y2="1"><stop stop-color="${night?'#5c7464':'#b1b88c'}"/><stop offset="1" stop-color="${night?'#334c48':'#7f9b75'}"/></linearGradient><linearGradient id="river" x2="0" y2="1"><stop stop-color="#9cbbbb"/><stop offset="1" stop-color="${night?'#64778a':'#93b8b4'}"/></linearGradient></defs><rect width="1200" height="560" fill="url(#sky)"/>`;
    out+=night?'<circle cx="945" cy="82" r="28" fill="#f1e4b7"/>':'<circle cx="930" cy="85" r="41" fill="#fae8b6" opacity=".85"/>';
    if(night)for(let i=0;i<40;i++)out+=`<circle cx="${(i*157+31)%1200}" cy="${(i*43+20)%170}" r="${i%3===0?1.5:1}" fill="#f2e4c4" opacity=".7"/>`;
    out+='<path d="M0 218 110 137 215 206 338 109 480 207 620 137 780 213 935 120 1070 203 1200 151V340H0Z" fill="#8fa599" opacity=".55"/><path d="M0 278Q170 169 346 245T690 230T1200 242V400H0Z" fill="#7e9987"/><path d="M0 312Q250 256 535 291T1200 275V560H0Z" fill="url(#grass)"/><path d="M1200 289Q1000 305 1003 366T882 437Q789 454 852 560H1100Q1000 477 1060 447T1123 370Q1114 326 1200 323Z" fill="url(#river)"/><path d="M0 452Q230 383 438 405T780 469L828 560H0Z" fill="#8caa7b" opacity=".45"/><path d="M571 560Q546 486 578 432T640 359L657 343" stroke="#c8b894" stroke-width="34" fill="none"/><path d="M340 408Q549 439 661 380T994 397" stroke="#c8b894" stroke-width="20" fill="none"/><path d="M970 387 1051 399M971 402 1049 414" stroke="#7c6d5d" stroke-width="8"/><path d="M975 380 1055 392M975 406 1050 418" stroke="#b7a180" stroke-width="3"/>';
    for(let i=0;i<40;i++){const x=(i*103+20)%1200,y=278+(i*29)%94;if(x<245||x>1090||y<310)out+=tree(x,y,.5+(i%4)*.1);}
    if(stage>=13)out+='<path d="M260 357V315h28v12h28v-12h28v42m501 22v-50h28v12h28v-12h28v50" fill="#a6a594" stroke="#898e83" stroke-width="2"/>';
    if(stage>=20)out+='<g fill="#c8c6b4" stroke="#999f95" stroke-width="2"><path d="M540 298V210h120v88"/><path d="M525 298V186h35v112m85 0V186h35v112"/></g><path d="M518 188 543 151 566 188m71 0 24-37 25 37" fill="#797a91"/><path d="M592 298v-35q8-13 16 0v35" fill="#7f827d"/><path d="M543 151v-25h24l-8 9 8 9h-24" fill="#d1aa8e"/>';
    const houses=[{x:470,y:338,s:.85},{x:720,y:340,s:.8},{x:398,y:391,s:.85},{x:784,y:410,s:1},{x:324,y:345,s:.65},{x:852,y:345,s:.7},{x:477,y:466,s:1.15},{x:686,y:482,s:1.15},{x:363,y:465,s:.9},{x:771,y:479,s:.8},{x:297,y:417,s:.8},{x:914,y:384,s:.75},{x:575,y:330,s:.65},{x:659,y:318,s:.7},{x:746,y:296,s:.6},{x:437,y:292,s:.6},{x:860,y:451,s:.8},{x:235,y:395,s:.65},{x:529,y:378,s:.65},{x:829,y:307,s:.6}];
    const count=Math.min(houses.length,3+Math.floor(Math.log2(Math.max(1,pop/3))*1.5));
    houses.slice(0,count).sort((a,b)=>a.y-b.y).forEach((h,i)=>{out+=house(h.x,h.y,h.s,['#ddd0aa','#c5bda1','#ded5b8','#ccc6ad'][i%4]);});
    if(f.inn>0)out+=house(552,400,1.4,'#e2cba4','inn');
    if(f.smith>0)out+=house(725,408,1.05,'#b7b2a2','smith');
    if(f.lab>0)out+=house(648,340,1.1,'#d7d0c1','lab');
    // Crowd is representative, not a one-to-one list of actual residents.
    const crowd=Math.min(60,Math.max(3,Math.round(3+Math.sqrt(Math.max(0,pop-3))*.9)));
    const coats=['#7e5360','#476e7e','#d4ad69','#5c7860','#9d7768','#77749b'];
    out+='<g class="town-crowd" aria-hidden="true">';
    for(let i=0;i<crowd;i++){
      const row=Math.floor(i/15),col=i%15;
      const x=304+col*41+(i*13%19),y=416+row*27+(i*7%13);
      const scale=.78+(y-410)/220;
      out+=`<g transform="translate(${x} ${y}) scale(${scale})"><g class="town-walker" style="animation-delay:-${i%9}s;animation-duration:${7+i%5}s"><ellipse cy="2" rx="4" ry="1.5" fill="#304339" opacity=".25"/><path d="M-2-1v-4m4 4v-4" stroke="#4e4a49" stroke-width="1.5"/><path d="M-3-5v-6q3-3 6 0v6" fill="${coats[i%coats.length]}"/><circle cy="-14" r="2.5" fill="#d9b08b"/><path d="M-3-15q3-5 6 0" fill="${i%3===0?'#e2c994':'#62554e'}"/></g></g>`;
    }
    out+='</g>';
    out+='<path d="M0 538Q135 457 279 520T531 560H0Z" fill="#668565"/>';
    out+=tree(99,525,1.8)+tree(1136,519,1.6)+tree(176,549,1.3)+tree(39,548,1.4);
    for(let i=0;i<18;i++)out+=`<circle cx="${250+i*43}" cy="${458+(i*17)%78}" r="2" fill="${night?'#c8b37a':'#e9d89d'}" opacity=".6"/>`;
    const svg=$('townScene');while(svg.children.length>2)svg.lastElementChild.remove();
    const group=document.createElementNS(svgNS,'g');group.innerHTML=out;svg.append(group);
    $('sceneTitle').textContent=(data?data.town.tier:'柚の街の風景イメージ')+'・'+(night?'夜':'昼');
  }
  function render(d) {
    current=d;$('sceneEmpty').hidden=true;scene(d);
    const t=d.town;$('townTier').textContent=t.tier;$('level').textContent='Lv. '+fmt(t.level);$('population').textContent=fmt(t.population)+' 人';
    $('growthLabel').textContent=fmt(t.progress)+' / '+fmt(t.required)+' EXP';$('growthBar').max=t.required;$('growthBar').value=t.progress;
    $('sceneCaption').textContent='発展段階 '+t.stage+' / 30';
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
  $('dayButton').addEventListener('click',()=>setNight(false));$('nightButton').addEventListener('click',()=>setNight(true));
  function setNight(value){night=value;$('dayButton').setAttribute('aria-pressed',String(!value));$('nightButton').setAttribute('aria-pressed',String(value));scene(current);}
  $('refreshButton').addEventListener('click',()=>{if(preview)render(current);else load();});
  scene(null);
  if(preview){$('sampleNote').hidden=false;render(sample(1));document.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>render(sample(Number(b.dataset.sample)))));}
  else{load();setInterval(()=>{if(!document.hidden)load();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}
})();
