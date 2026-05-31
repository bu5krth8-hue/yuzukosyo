export async function onRequest(context){
const env=context.env ||{};
const kv=env.SITE_STATS;
if(!kv){
return json({
configured:false,
total:0,
message:"Cloudflare KV binding「SITE_STATS」が未設定です"
},200);
}
try{
const key="total_access";
const currentValue=await kv.get(key);
const current=Number.parseInt(currentValue || "0",10);
const next=Number.isFinite(current)? current+1:1;
await kv.put(key,String(next));
return json({
configured:true,
total:next,
message:"アクセス数を更新しました"
});
}catch(error){
return json({
configured:false,
total:0,
message:"アクセス数の更新に失敗しました",
error:error.message
},500);
}
}
function json(data,status=200){
return new Response(JSON.stringify(data),{
status,
headers:{
"Content-Type":"application/json;charset=utf-8",
"Cache-Control":"no-store,no-cache,must-revalidate,max-age=0",
"Pragma":"no-cache",
"Expires":"0"
}
});
}
