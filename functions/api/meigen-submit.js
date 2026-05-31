const KV_KEY="meigen_submissions_v1";
const ADMIN_PASSWORD="5563937564";
const MAX_ITEMS=200;
export async function onRequest(context){
const request=context.request;
const env=context.env ||{};
const kv=env.MEIGEN_SUBMISSIONS || env.SITE_STATS;
if(request.method==="OPTIONS"){
return json({ok:true},200);
}
if(!kv){
return json({
configured:false,
ok:false,
items:[],
message:"Cloudflare KV binding「SITE_STATS」または「MEIGEN_SUBMISSIONS」が未設定です"
},503);
}
try{
if(request.method==="POST"){
const body=await readJson(request);
const item=normalizeSubmission(body);
if(!item.text){
return json({ok:false,message:"迷言が未入力です"},400);
}
const items=await readItems(kv);
const signature=itemSignature(item);
const exists=items.some((current)=>current.id===item.id || itemSignature(current)===signature);
const nextItems=exists ? items:[item,...items].slice(0,MAX_ITEMS);
await kv.put(KV_KEY,JSON.stringify(nextItems));
return json({configured:true,ok:true,received:item.id});
}
if(request.method==="GET"){
if(!isAdmin(request)){
return json({ok:false,message:"管理権限がありません"},403);
}
const items=await readItems(kv);
return json({configured:true,ok:true,items});
}
if(request.method==="DELETE"){
if(!isAdmin(request)){
return json({ok:false,message:"管理権限がありません"},403);
}
const body=await readJson(request);
const id=String(body.id || "").trim();
if(!id){
return json({ok:false,message:"削除IDがありません"},400);
}
const items=await readItems(kv);
const nextItems=items.filter((item)=>item.id !==id);
await kv.put(KV_KEY,JSON.stringify(nextItems));
return json({configured:true,ok:true,deleted:id,items:nextItems});
}
return json({ok:false,message:"許可されていないメソッドです"},405);
}catch(error){
return json({ok:false,message:"投稿案APIでエラーが発生しました",error:error.message},500);
}
}
async function readJson(request){
try{
return await request.json();
}catch(error){
return{};
}
}
async function readItems(kv){
const raw=await kv.get(KV_KEY);
if(!raw)return[];
try{
const parsed=JSON.parse(raw);
return Array.isArray(parsed)? parsed.map(normalizeSubmission).filter((item)=>item.text):[];
}catch(error){
return[];
}
}
function normalizeSubmission(raw){
const item=raw && typeof raw==="object" ? raw:{};
return{
id:String(item.id || `submit-${Date.now()}-${crypto.randomUUID().slice(0,8)}`),
text:cleanText(item.text,280),
speaker:cleanText(item.speaker,80)|| "未設定",
place:cleanText(item.place,80)|| "未設定",
date:cleanText(item.date,80)|| "未設定",
sender:cleanText(item.sender,80)|| "匿名",
memo:cleanText(item.memo,240),
createdAt:cleanText(item.createdAt,40)|| new Date().toISOString()
};
}
function cleanText(value,limit){
return String(value || "")
.replace(/[\u0000-\u001F\u007F]/g," ")
.replace(/\s+/g," ")
.trim()
.slice(0,limit);
}
function itemSignature(item){
return[item.text,item.speaker,item.place,item.date,item.sender,item.memo]
.map((value)=>String(value || "").trim().replace(/\s+/g," "))
.join("|");
}
function isAdmin(request){
const headerValue=request.headers.get("X-Meigen-Admin")|| "";
const url=new URL(request.url);
const queryValue=url.searchParams.get("admin")|| "";
return headerValue===ADMIN_PASSWORD || queryValue===ADMIN_PASSWORD;
}
function json(data,status=200){
return new Response(JSON.stringify(data),{
status,
headers:{
"Content-Type":"application/json;charset=utf-8",
"Cache-Control":"no-store,no-cache,must-revalidate,max-age=0",
"Pragma":"no-cache",
"Expires":"0",
"Access-Control-Allow-Origin":"*",
"Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS",
"Access-Control-Allow-Headers":"Content-Type,X-Meigen-Admin"
}
});
}
