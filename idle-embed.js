// Only render as an embedded view when this page really is inside the owner's hub.
if(window.parent!==window&&new URLSearchParams(location.search).get('idleEmbed')==='1'){
 document.documentElement.classList.add('idle-embedded');
 const style=document.createElement('style');style.textContent='.idle-embedded body>header,.idle-embedded .hero,.idle-embedded .play-nav{display:none!important}.idle-embedded main{padding:14px!important;max-width:100%!important;margin:auto!important}.idle-embedded body{min-width:0!important}';document.head.append(style);
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const url=new URL(a.href);if(url.origin!==location.origin)return;if(['life.html','town.html','rpg.html','newspaper.html','play.html','work.html'].includes(url.pathname.split('/').pop())){e.preventDefault();parent.postMessage({type:'yuzu-idle-navigation',path:url.pathname+url.hash},location.origin);}});
}
