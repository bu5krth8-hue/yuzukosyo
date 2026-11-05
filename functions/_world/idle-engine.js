import {CHAPTERS,FOCUS} from './idle-story.js';
export const STEP=1800000,CAP=86400000;
export const fresh=()=>({schema:1,ticks:0,energy:80,focus:'balanced',wood:0,ore:0,crystal:0,friendship:0,home:1,read:[],choices:{},coat:0,furniture:[]});
export function valid(s){if(s?.schema!==1||!Object.hasOwn(FOCUS,s.focus)||!Array.isArray(s.read)||!Array.isArray(s.furniture)||!s.choices||['ticks','energy','wood','ore','crystal','friendship','home','coat'].some(k=>!Number.isSafeInteger(s[k])||s[k]<0)||s.energy>100||s.home<1||s.home>5)throw Error('save_invalid');return s;}
export function projection(row,now){if(!Number.isSafeInteger(now)||now<row.cursor_ms)throw Error('clock_conflict');const elapsed=now-row.cursor_ms,count=Math.min(48,Math.floor(elapsed/STEP));return {count,elapsed,creditedMs:Math.min(CAP,elapsed),discardedMs:Math.max(0,elapsed-CAP),nextCursor:elapsed>=CAP?now-elapsed%STEP:row.cursor_ms+count*STEP};}
export function settle(row,now){const s=valid(JSON.parse(row.state_json)),p=projection(row,now),events=[];for(let i=0;i<p.count;i++){const n=++s.ticks,rest=s.focus==='rest'||s.energy<25,kind=rest?'rest':s.focus==='balanced'?['gather','explore','social'][n%3]:s.focus;let text;
 if(rest){s.energy=Math.min(100,s.energy+24);text='柚寧の宿屋で休息。温かい食事で、旅の疲れを癒しました。';}
 else if(kind==='gather'){s.energy-=8;s.wood+=2;s.ore+=n%2;text='ロウと道具を手入れし、住まい用の木材を2個集めました。'+(n%2?'鉱石も1個見つかりました。':'');}
 else if(kind==='social'){s.energy-=4;s.friendship++;text='街の食卓で住民と語らい、親交が深まりました。';}
 else {s.energy-=12;s.wood++;if(n%3===0)s.crystal++;text=n%4===0?'セナと霧の境界へ。危険を察して無事に引き返し、道標の記録を持ち帰りました。':'セナと古い街道を調査。帰り道を記録し、住まい用の木材を1個持ち帰りました。';}
 const chapter=CHAPTERS.findIndex(c=>c.at===n);if(chapter>=0)text+=' 新しい物語「'+CHAPTERS[chapter].title+'」が届きました。';
 events.push({tick:n,at:row.cursor_ms+(i+1)*STEP,text,kind});}
 if(p.count>0)s.lastSettlement={at:now,count:p.count,credited:p.count*STEP,discarded:p.discardedMs};
 return {s,p,events};}
