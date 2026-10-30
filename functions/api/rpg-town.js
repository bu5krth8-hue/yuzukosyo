const KEY = 'yuzu_town_public_v1';
const MAX = 8192;
const names = ['小さな集落','開拓集落','柚の村','豊穣の村','街道の村','宿場町','市場町','職人の町','港町','交易都市','学術都市','工芸都市','城下町','大城下町','商業都市','文化都市','大都市','自治都市','都府','王都','大王都','皇都','帝都','大帝都','連邦首都','世界都市','星都','天空都市','伝説都市','永遠の柚都'];
const thresholds = [3,20,40,60,80,100,140,180,220,280,350,450,600,800,1000,1300,1700,2200,2800,3500,4300,5200,6200,7300,8500,10000,12000,15000,20000,30000];
const reply = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function number(n, max=Number.MAX_SAFE_INTEGER) { if (!Number.isSafeInteger(n)||n<0||n>max) throw Error('invalid'); return n; }
function validate(d) {
  if (d?.schema!==1 || typeof d.capturedAt!=='string') throw Error('invalid');
  const stamp=Date.parse(d.capturedAt);
  if (!Number.isFinite(stamp)||stamp<Date.UTC(2020,0,1)||stamp>Date.now()+300000) throw Error('invalid');
  const t=d.town, r=d.resources, f=d.facilities, q=d.quest;
  const level=number(t?.level,1000000000), population=number(t?.population), exp=number(t?.exp);
  if(level<1||population!==3+(level-1)*20||exp<15*level*(level-1)||exp>=15*level*(level+1))throw Error('invalid');
  let tier=0; thresholds.forEach((n,i)=>{if(population>=n)tier=i;});
  const types=['木材集め','鉱石集め','魔物調査','帰還の手伝い'], goals=[6,4,3,2];
  const questType=number(q?.type,3), progress=number(q?.progress,goals[questType]-1);
  return {schema:1,capturedAt:new Date(stamp).toISOString(),town:{level,population,exp,tier:names[tier],stage:tier+1,
    progress:exp-15*level*(level-1),required:30*level},
    resources:{wood:number(r?.wood),ore:number(r?.ore),crystal:number(r?.crystal)},
    facilities:{inn:number(f?.inn,5),smith:number(f?.smith,5),lab:number(f?.lab,5)},
    residents:[{name:'柚寧',role:'宿屋の女将',arrived:population>=40},{name:'鉄心',role:'名匠',arrived:population>=100},{name:'ルミナ',role:'星読みの学者',arrived:population>=180}],
    quest:{name:types[questType],type:questType,progress,goal:goals[questType]},pending:d.pending===true};
}
async function readLimited(request) {
  if(Number(request.headers.get('content-length')||0)>MAX)throw Error('large');
  const reader=request.body?.getReader();if(!reader)throw Error('invalid');
  let length=0,chunks=[];
  for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX){await reader.cancel();throw Error('large');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
async function authorized(request,secret) {
  const header=request.headers.get('Authorization')||'';
  if(!header.startsWith('Bearer ')||header.length>1024)return false;
  const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([hash(header.slice(7)),hash(secret)]);let delta=0;for(let i=0;i<a.length;i++)delta|=a[i]^b[i];return delta===0;
}
export async function onRequest({request,env}) {
  if(request.method!=='GET'&&request.method!=='POST')return reply({error:'method_not_allowed'},405);
  const kv=env.RPG_TOWN;
  if(!kv)return reply({configured:false,data:null,message:'街データの連携準備中です。'},503);
  if(request.method==='GET') {
    try {const raw=await kv.get(KEY);return reply({configured:true,data:raw?validate(JSON.parse(raw)):null});}
    catch{return reply({error:'town_unavailable'},503);}
  }
  if(typeof env.RPG_TOWN_TOKEN!=='string'||env.RPG_TOWN_TOKEN.length<32)return reply({error:'sync_not_configured'},503);
  if(!await authorized(request,env.RPG_TOWN_TOKEN))return reply({error:'unauthorized'},401);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return reply({error:'json_required'},415);
  let data;
  try{data=validate(await readLimited(request));}catch(e){return reply({error:e.message==='large'?'payload_too_large':'invalid_payload'},e.message==='large'?413:400);}
  try {
    const old=await kv.get(KEY);
    if(old && Date.parse(JSON.parse(old).capturedAt)>Date.parse(data.capturedAt))return reply({error:'older_snapshot'},409);
    await kv.put(KEY,JSON.stringify(data));return reply({ok:true,capturedAt:data.capturedAt});
  }catch{return reply({error:'save_failed'},503);}
}
