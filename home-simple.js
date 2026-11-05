(()=>{'use strict';
 const select=document.getElementById('homeRpgDestination'),go=document.getElementById('homeRpgGo');
 if(select&&go){const allowed=new Set([...select.options].map(o=>o.value).filter(Boolean));select.addEventListener('change',()=>{go.disabled=!allowed.has(select.value);});go.addEventListener('click',()=>{if(allowed.has(select.value))location.assign(select.value);});}
 function reveal(hash){if(!hash||hash==='#top')return;let id;try{id=decodeURIComponent(hash.slice(1));}catch{return;}const target=document.getElementById(id);if(!target)return;
  const map={visitStamp:'homeStamp',omikuji:'homeFortune',todayBase:null};const details=map[id]?document.getElementById(map[id]):null;if(details)details.open=true;
  for(let p=target.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
  if(select&&['yuzuWorld','yuzuRpg','yuzuNewspaper'].includes(id)){select.value={yuzuWorld:'world.html',yuzuRpg:'rpg.html#players',yuzuNewspaper:'newspaper.html'}[id];go.disabled=false;}
  requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'auto'}));
 }
 document.addEventListener('click',e=>{const link=e.target.closest('a[href^="#"]');if(link)reveal(link.getAttribute('href'));});window.addEventListener('hashchange',()=>reveal(location.hash));reveal(location.hash);
})();
