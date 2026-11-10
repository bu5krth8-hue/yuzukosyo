export function portrait(look,previewUrl=null) {
  const node=document.createElement('span'),sprite=document.createElement('i');
  node.className='rpg-portrait';
  node.setAttribute('aria-hidden','true');
  sprite.className='rpg-portrait-sprite';
  sprite.dataset.sprite=look.sprite;
  sprite.dataset.color=look.color;
  if (previewUrl||look.image) {
    const img=document.createElement('img');
    img.src=previewUrl||look.image;
    img.alt='';
    img.addEventListener('error',()=>img.replaceWith(sprite),{once:true});
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
