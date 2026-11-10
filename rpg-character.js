import {portrait} from './rpg-portrait.js';

const form=document.getElementById('characterForm'),fields=form.elements;
const status=document.getElementById('characterStatus'),preview=document.getElementById('characterPreview');
let record,avatar,removeImage=false,busy=false;
const preferences=()=>Object.fromEntries(['sprite','color','accessory','gender'].map(key=>[key,fields[key].value]));
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
  for (const key of ['sprite','color','accessory']) fields[key].value=record.look[key];
  fields.gender.value=record.gender;
  fields.shareImage.checked=record.shareImage;
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
  submit.disabled=true;
  status.textContent='保存しています…';
  try {
    await api({...preferences(),shareImage:fields.shareImage.checked,avatar,removeImage});
    avatar=undefined;
    removeImage=false;
    await load();
    status.textContent='キャラを保存しました。オート冒険で表示されます。';
  } catch(error) {
    status.textContent=error.message==='login'?'ログインし直してから保存してください。':'保存結果を確認できませんでした。もう一度お試しください。';
  } finally {busy=false;submit.disabled=false;}
});
load().then(()=>{status.textContent='見た目を選んで保存してください。';}).catch(error=>{
  status.textContent=error.message==='login'?'キャラ作成にはログインが必要です。':'キャラを読み込めませんでした。ページを再読み込みしてください。';
  document.getElementById('characterLogin').hidden=error.message!=='login';
});
