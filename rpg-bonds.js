import {portrait} from './rpg-portrait.js?v=295';

const box=document.getElementById('adventurerBonds'),list=document.getElementById('bondList'),
  status=document.getElementById('bondStatus'),query=document.getElementById('bondSearch'),sort=document.getElementById('bondSort');
let account=null,generation=0,pairs=[],loaded=false,controller=null;
const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
function render(){
  const term=query.value.trim().toLocaleLowerCase('ja');
  const visible=pairs.filter(p=>p.name.toLocaleLowerCase('ja').includes(term)).sort((a,b)=>
    sort.value==='name'?a.name.localeCompare(b.name,'ja'):b.exp-a.exp||a.name.localeCompare(b.name,'ja'));
  list.replaceChildren();
  if(!visible.length){list.append(make('p',pairs.length?'該当する仲間がいません。':'一緒に討伐・救助・冒険・対人戦をすると絆が記録されます。'));return;}
  for(const pair of visible){
    const card=make('article',undefined,'bond-card'),heading=make('div',undefined,'bond-heading');
    if(pair.look)heading.append(portrait(pair.look));
    heading.append(make('h3',pair.name));
    card.append(heading,make('p','絆Lv.'+pair.level+'【'+pair.relationship+'】','bond-level'));
    const progress=make('progress');progress.max=pair.next?pair.next-pair.floor:1;
    progress.value=pair.next?pair.exp-pair.floor:1;progress.setAttribute('aria-label',pair.name+'との絆EXP');
    card.append(progress,make('p',pair.next?'累計 '+pair.exp+' / '+pair.next+' EXP　次まで '+(pair.next-pair.exp)+' EXP':'累計 '+pair.exp+' EXP　最大レベル'));
    card.append(make('p','共闘時の攻撃力 ＋'+pair.bonus,'bond-bonus'));
    const labels=['ボス討伐','連携','救助協力','冒険','対人戦'],records=make('details'),summary=make('summary','共に歩んだ記録');
    records.append(summary,make('p',labels.map((label,i)=>label+' '+pair.counts[i]+'回').join(' ／ ')));
    card.append(records);list.append(card);
  }
}
async function refresh(force=false){
  if(!account||loaded&&!force)return;
  controller?.abort();const active=new AbortController();controller=active;
  const token=++generation;
  status.textContent='絆の記録を読み込んでいます…';
  document.getElementById('bondRefresh').disabled=true;
  const timer=setTimeout(()=>active.abort(),12000);
  try{
    const response=await fetch('api/rpg-bonds',{cache:'no-store',credentials:'same-origin',signal:active.signal});
    if(!response.ok)throw Error('request');
    const data=await response.json();
    if(token!==generation)return;
    pairs=data.pairs;loaded=true;render();
    status.textContent=data.capturedAt?'配信との同期 '+new Date(data.capturedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'最初の絆の同期を待っています。';
  }catch(error){if(token===generation){loaded=false;status.textContent='絆を読み込めませんでした。「最新の絆へ」で再試行できます。';}}
  finally{clearTimeout(timer);if(token===generation)document.getElementById('bondRefresh').disabled=false;}
}
document.addEventListener('yuzu-account',event=>{
  const id=event.detail.id;
  if(account!==id){controller?.abort();generation++;pairs=[];loaded=false;list.replaceChildren();}
  account=id;box.hidden=!id;if(id)refresh();
});
query.addEventListener('input',render);sort.addEventListener('change',render);
document.getElementById('bondRefresh').addEventListener('click',()=>refresh(true));
