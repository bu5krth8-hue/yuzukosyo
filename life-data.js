export const DAY=86400000, MARRIAGE_DAYS=20, BIRTH_DAYS=40, WORK_DAYS=60, MAX_WORK_MINUTES=480;
export function familyStage(f,now=Date.now()){
 const until=f.ended_at===null?now:Math.min(now,f.ended_at),days=Math.max(0,Math.floor((until-f.formed_at)/DAY));
 const born=(f.ended_at===null||f.ended_at>=f.formed_at+BIRTH_DAYS*DAY)&&now>=f.formed_at+BIRTH_DAYS*DAY;
 return {days,stage:f.ended_at!==null?'ended':days>=60?'working':days>=40?'child':days>=20?'married':'lovers',born,mature:born&&now>=f.formed_at+WORK_DAYS*DAY,
 marriageAt:f.formed_at+MARRIAGE_DAYS*DAY,birthAt:f.formed_at+BIRTH_DAYS*DAY,workAt:f.formed_at+WORK_DAYS*DAY};
}
export function aliasName(value){const letters=String(value||'').normalize('NFKC').match(/\p{L}/gu)||[];return letters.slice(0,12).join('')||'柚';}
export function nameCandidates(a,b,round=0){
 const left=Array.from(aliasName(a)),right=Array.from(aliasName(b));
 const at=(list,n)=>list[((n%list.length)+list.length)%list.length];
 const pool=[at(left,round)+at(right,-1-round),at(right,round)+at(left,-1-round),left.slice(0,2).join('')+at(right,round),right.slice(0,2).join('')+at(left,round)];
 const result=[...new Set(pool)];const suffixes=['乃','音','希','晴','実','凛','陽'];for(let i=0;i<suffixes.length;i++){if(result.length>=3)break;const suffix=suffixes[(i+round)%suffixes.length],name=at(left,round)+at(right,round)+suffix;if(!result.includes(name))result.push(name);}
 return result.slice(0,3).map(n=>Array.from(n).slice(0,8).join(''));
}
export function familyProjection(worker,family,now=Date.now()){
 const stage=familyStage(family,now);
 if(!stage.mature||now<worker.cursor_ms)return {minutes:0,exp:0,coins:0,full:false,nextCursor:now,expRemainder:worker.exp_remainder,coinRemainder:worker.coin_remainder};
 const elapsed=now-Math.max(worker.cursor_ms,stage.workAt),minutes=Math.min(MAX_WORK_MINUTES,Math.floor(elapsed/60000));
 const e=minutes*2+worker.exp_remainder,c=minutes+worker.coin_remainder;
 return {minutes,exp:Math.floor(e/60),coins:Math.floor(c/60),full:elapsed>=MAX_WORK_MINUTES*60000,nextCursor:elapsed>=MAX_WORK_MINUTES*60000?now:Math.max(worker.cursor_ms,stage.workAt)+minutes*60000,expRemainder:e%60,coinRemainder:c%60};
}
