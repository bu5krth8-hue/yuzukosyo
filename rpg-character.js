import {portrait} from './rpg-portrait.js?v=295';
import {looks,lookIds} from './rpg-look-catalog.js?v=295';

const form=document.getElementById('characterForm'),fields=form.elements;
const status=document.getElementById('characterStatus'),preview=document.getElementById('characterPreview');
let record,avatar,removeImage=false,busy=false;
const byId = id => document.getElementById(id);
let shown = 12;
let selected = 'forest';
let favoriteKey = '';
let favorites = new Set();
const grid = byId('lookGrid');
const filters = [byId('lookSearch'), byId('lookTheme'), byId('lookFavorites')];

function setAccountLooks(id, sprite) {
  selected = lookIds.has(sprite) ? sprite : 'forest';
  favoriteKey = id ? 'yuzu-look-favorites-v1:' + id : '';
  favorites = new Set();
  try {
    const saved = favoriteKey && JSON.parse(localStorage.getItem(favoriteKey));
    if (Array.isArray(saved)) favorites = new Set(saved.filter(id => lookIds.has(id)));
  } catch { /* Private mode can restrict storage. */ }
  renderLooks();
}

function renderLooks() {
  const query = filters[0].value.trim().normalize('NFKC').toLocaleLowerCase('ja');
  const gender = fields.gender.value;
  const entries = looks.filter(([id,name,style,theme]) =>
    (!['male','female'].includes(gender) || gender === style) &&
    (!filters[1].value || theme === filters[1].value) &&
    (!filters[2].checked || favorites.has(id)) &&
    (!query || (name+' '+theme).toLocaleLowerCase('ja').includes(query)));
  byId('lookCount').textContent = entries.length ? '全'+looks.length+'種 ／ 表示 '+Math.min(shown,entries.length)+' / '+entries.length+'種' : '条件に合う外見がありません。';
  byId('lookMore').hidden = entries.length <= shown;
  byId('lookSelected').textContent = '選択中：'+looks.find(([id]) => id === selected)[1];
  const cards = document.createDocumentFragment();
  for (const [id,name,,theme] of entries.slice(0,shown)) {
    const item = document.createElement('article');
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'look-choice';
    choose.setAttribute('aria-pressed', String(id === selected));
    const nameNode = document.createElement('strong');
    nameNode.textContent = name;
    const category = document.createElement('span');
    category.textContent = theme;
    choose.append(portrait({sprite:id,color:'original',accessory:'none'}),nameNode,category);
    choose.onclick = () => {
      selected=id;
      draw();
      renderLooks();
      grid.querySelector('[aria-pressed=true].look-choice')?.focus({preventScroll:true});
    };
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'look-favorite';
    favorite.textContent = favorites.has(id) ? '★' : '☆';
    favorite.setAttribute('aria-label',name+'をお気に入りに登録');
    favorite.setAttribute('aria-pressed', String(favorites.has(id)));
    favorite.onclick = () => {
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      try { if (favoriteKey) localStorage.setItem(favoriteKey,JSON.stringify([...favorites])); }
      catch { /* The current tab can still use favorites. */ }
      favorite.textContent = favorites.has(id) ? '★' : '☆';
      favorite.setAttribute('aria-pressed', String(favorites.has(id)));
      if (filters[2].checked && !favorites.has(id)) {
        renderLooks();
        filters[2].focus();
      }
    };
    item.append(choose,favorite);
    cards.append(item);
  }
  grid.replaceChildren(cards);
}

for (const field of [...filters,fields.gender]) {
  field.addEventListener(field.type === 'search' ? 'input' : 'change',()=>{
    shown=12;
    renderLooks();
  });
}
byId('lookMore').onclick = () => {
  const first = shown;
  shown+=12;
  renderLooks();
  grid.querySelectorAll('.look-choice')[first]?.focus({preventScroll:true});
};

const preferences=()=>({sprite:selected,color:fields.color.value,accessory:fields.accessory.value,gender:fields.gender.value});
function draw() {
  preview.replaceChildren(portrait({...preferences(),image:removeImage?null:record?.look.image},avatar));
}
async function api(body) {
  const response=await fetch('api/rpg-character',body?{
    method:'POST',headers:{'Content-Type':'application/json','X-RPG-CSRF':record.csrf},body:JSON.stringify(body)
  }:{cache:'no-store'});
  if (!response.ok) throw Error(response.status===401?'login':'network');
  return response.json();
}
async function load() {
  record=await api();
  for (const key of ['color','accessory']) fields[key].value=record.look[key];
  fields.gender.value=record.gender;
  fields.shareImage.checked=record.shareImage;
  fields.publicLook.checked=record.publicLook;
  setAccountLooks(record.id,record.look.sprite);
  form.hidden=false;
  draw();
}
form.addEventListener('change',draw);
fields.image.addEventListener('change',async()=>{
  if (busy) return;
  const file=fields.image.files[0];
  if (!file) return;
  if (file.size>10000000||!['image/png','image/jpeg','image/webp'].includes(file.type)) {
    status.textContent='PNG・JPEG・WebPの10 MB以下の画像を選んでください。';
    fields.image.value='';
    return;
  }
  busy=true;
  try {
    const image=await createImageBitmap(file);
    try {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=256;
      const size=Math.min(image.width,image.height);
      canvas.getContext('2d').drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,256,256);
      avatar=canvas.toDataURL('image/webp',.8);
      if (!avatar.startsWith('data:image/webp;base64,')||avatar.length>131100) throw Error('image');
      removeImage=false;
      status.textContent='画像をプレビュー中です。「キャラを保存」で反映します。';
      draw();
    } finally { image.close(); }
  } catch {avatar=undefined;status.textContent='画像を読み込めませんでした。別の画像を選んでください。';}
  finally {busy=false;fields.image.value='';}
});
document.getElementById('removeCharacterImage').addEventListener('click',()=>{
  if(busy||!confirm('キャラと街の住人に使っている画像を外しますか？ 保存すると反映されます。')) return;
  avatar=undefined;
  removeImage=true;
  draw();
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if (busy) return;
  busy=true;
  const submit=form.querySelector('[type=submit]');
  form.inert=true;
  submit.disabled=true;
  status.textContent='保存しています…';
  try {
    await api({...preferences(),shareImage:fields.shareImage.checked,publicLook:fields.publicLook.checked,avatar,removeImage});
    avatar=undefined;
    removeImage=false;
    try { await load(); } catch { /* The save already succeeded. */ }
    status.textContent='キャラクターを保存しました！ 画面を切り替えても大丈夫です。';
  } catch(error) {
    status.textContent=error.message==='login'?'ログインし直してから保存してください。':'保存結果を確認できませんでした。もう一度お試しください。';
  } finally {busy=false;form.inert=false;submit.disabled=false;}
});
load().then(()=>{status.textContent='見た目を選んで保存してください。';}).catch(error=>{
  status.textContent=error.message==='login'?'キャラ作成にはログインが必要です。':'キャラを読み込めませんでした。ページを再読み込みしてください。';
  document.getElementById('characterLogin').hidden=error.message!=='login';
});
