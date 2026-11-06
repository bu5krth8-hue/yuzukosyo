export function activityCards(d){
 const services=Object.fromEntries((d.services||[]).map(s=>[s.name,s.ok?s.data:null])),p=services.explore,w=services.work,now=d.now,out=[];
 const j=d.state?.journey;
 if(j&&!j.claimed)out.push({title:({adventure:'オート冒険中',town:'街へ貢献中',income:'お金稼ぎ中'})[j.mode]||'活動中',text:(now>=j.end?'24時間分が満杯です。':'活動が進んでいます。')+'帰還・受取後に次の活動へ出発できます。',href:'/idle-world#activities',start:j.started,end:j.end,kind:'journey'});
 for(const m of p?.missions||[])if(m.status==='running')out.push({title:m.kind==='errand'?'以前の街の手伝い':'以前の探索',text:now>=m.ends_at?'帰還済みです。結果を受け取るとオート冒険へ出発できます。':'この探索が終わり、結果を受け取るまでオート冒険には出発できません。',href:'/idle-world#legacyStatus',start:m.started_at,end:m.ends_at,kind:'mission'});
 if(w?.work)out.push({title:'以前の仕事が勤務中',text:'仕事を終了・回収するとオート冒険へ出発できます。',href:'/idle-world#legacyStatus',start:w.work.cursorMs,end:w.work.cursorMs+28800000,kind:'work'});
 if(!p||!w)out.push({title:'活動情報の確認が必要です',text:'一部の情報を取得できません。オート冒険で最新の状態を確認してください。',href:'/idle-world#activities'});
 else if(!out.length)out.push({title:'オート冒険へ出発できます',text:'冒険・街への貢献・お金稼ぎからひとつ選びましょう。',href:'/idle-world#activities'});
 return out;
}
