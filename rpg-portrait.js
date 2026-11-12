import {assetForLook} from './rpg-look-catalog.js?v=295';
export function portrait(look,previewUrl=null) {
  const node=document.createElement('span'),sprite=document.createElement('i');
  node.className='rpg-portrait';
  node.setAttribute('aria-hidden','true');
  sprite.className='rpg-portrait-sprite';
  sprite.dataset.sprite=look.sprite;
  const asset=assetForLook(look.sprite);
  if(asset)sprite.dataset.sprite='forest';
  sprite.dataset.color=look.color;
  if (previewUrl||look.image||asset) {
    const img=document.createElement('img');
    img.loading='lazy';
    img.decoding='async';
    const custom=previewUrl||look.image;
    if(!custom){img.className='look-art';img.dataset.color=look.color;}
    img.src=custom||asset;
    img.alt='';
    img.addEventListener('error',()=>{
      if(custom&&asset){
        img.className='look-art';img.dataset.color=look.color;
        img.addEventListener('error',()=>img.replaceWith(sprite),{once:true});
        img.src=asset;
      }else img.replaceWith(sprite);
    },{once:true});
    node.append(img);
  } else node.append(sprite);
  const mark={leaf:'🌿',star:'✦',ribbon:'🎀'}[look.accessory];
  if (mark) {
    const charm=document.createElement('span');
    charm.className='rpg-portrait-charm';
    charm.textContent=mark;
    node.append(charm);
  }
  return node;
}
