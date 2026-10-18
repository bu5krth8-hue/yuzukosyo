(function () {
 "use strict";
 function normalized(value) { return String(value).normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, " ").trim(); }
 function setupDestinationSearch() {
  const nav = document.getElementById("shortcutMenuLinks");
  if (!nav) return;
  const originalLinks = Array.from(nav.querySelectorAll("a"));
  const extra = document.createElement("div"); extra.className = "destination-extra-links";
  const rooms = [
   ["🌙 はじめての方へ", "first-visit.html", "初見 初心者 案内 参加 ルール"],
   ["👤 プロフィール", "profile.html", "柚胡椒 自己紹介 配信者"],
   ["👻 秘密基地の住人", "mascots.html", "幽霊 たぬちゃん キャラクター マスコット"],
   ["📖 小説の話数一覧", "novel.html", "物語 読む エピソード"],
   ["📜 今日の格言", "quotes.html", "名言 言葉"],
   ["🗯️ みんなの迷言集", "meigen.html", "名言 面白い ファミリー"],
   ["📮 迷言を投稿", "meigen-submit.html", "送る 投稿 フォーム"],
   ["📮 過去のスタンプ履歴", "stamp-history.html", "出席表 来場 回数 バックアップ 保存 復元"],
   ["🔮 過去のくじ履歴", "omikuji-history.html", "おみくじ 占い 運勢 バックアップ 保存 復元"]
  ];
  rooms.forEach(([label, href, words]) => { const a = document.createElement("a"); a.href = href; a.textContent = label; a.dataset.searchWords = words; extra.append(a); });
  const aliases = {socialLinks:"SNS ツイッター Twitter X Discord Twitch YouTube 動画",lineStamps:"LINE ライン スタンプ 販売 ショップ",appSales:"アプリ 販売 BOOTH ボース ショップ",visitStamp:"スタンプ 出席 来場 バックアップ 保存 復元",schedule:"予定 スケジュール 配信",omikuji:"おみくじ 占い 運勢",themeColors:"テーマ カラー 色 変更",novel:"小説 物語 読む",apps:"アプリ パシャ読み OCR 読み上げ ツール",'stream-gear':"機材 マイク PC パソコン 使ってるもの",updates:"更新 お知らせ 履歴"};
  const form = document.createElement("form"); form.className = "destination-search"; form.setAttribute("role", "search"); form.setAttribute("aria-label", "秘密基地の行き先検索");
  const label = document.createElement("label"); label.htmlFor = "destinationSearch"; label.textContent = "🔎 行き先を検索";
  const row = document.createElement("div"); row.className = "destination-search-row";
  const input = document.createElement("input"); input.id = "destinationSearch"; input.type = "search"; input.placeholder = "小説・スタンプ・プロフィール…"; input.autocomplete = "off";
  const clear = document.createElement("button"); clear.type = "button"; clear.textContent = "クリア"; clear.hidden = true;
  const status = document.createElement("p"); status.className = "destination-search-status"; status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  row.append(input, clear); form.append(label, row); nav.prepend(form); nav.append(extra, status);
  const links = originalLinks.concat(Array.from(extra.querySelectorAll("a")));
  function update() {
   const terms = normalized(input.value).split(" ").filter(Boolean);
   let count = 0;
   links.forEach(a => {
    const id = a.hash.slice(1);
    const haystack = normalized(a.textContent + " " + (aliases[id] || "") + " " + (a.dataset.searchWords || ""));
    const isExtra = extra.contains(a);
    const show = terms.length ? terms.every(term => haystack.includes(term)) : !isExtra;
    a.hidden = !show; if (show) count++;
   });
   extra.hidden = !terms.length || !Array.from(extra.children).some(a => !a.hidden);
   clear.hidden = !terms.length;
   status.hidden = !terms.length;
   status.textContent = count ? `${count}件の行き先が見つかりました。` : "見つかりませんでした。別の言葉で探してみてね。";
  }
  input.addEventListener("input", update);
  clear.addEventListener("click", () => { input.value = ""; update(); input.focus(); });
  form.addEventListener("submit", event => { event.preventDefault(); const match = links.find(a => !a.hidden); if (normalized(input.value) && match) match.click(); });
  update();
 }
 function setupNovelReader() {
  const page = document.querySelector(".novel-page"), controls = document.getElementById("novelReaderControls");
  if (!page || !controls) return;
  const sizes = controls.querySelectorAll("[data-reader-size]");
  const resume = document.getElementById("novelResumeButton"), status = document.getElementById("novelReaderStatus");
  const episodes = Array.from(page.querySelectorAll(".novel-episode-panel"));
  const key = "yuzuNovelReaderV1";
  const readState = () => { try { return normalizeYuzuReaderState(JSON.parse(localStorage.getItem(key) || "null")); } catch (_) { return normalizeYuzuReaderState(null); } };
  let state = readState(), lastSaved = "", scrollTimer = null, suspendUntil = 0;
  const tools = document.createElement("div"); tools.className = "novel-reading-tools"; tools.hidden = true; tools.setAttribute("role","region"); tools.setAttribute("aria-label","読書しおり");
  const progress = document.createElement("span"), mark = document.createElement("button"); mark.type = "button"; mark.textContent = "🔖 今の位置を保存"; tools.append(progress,mark); document.body.append(tools);
  function unlocked(episode) { return episode && (!episode.classList.contains("novel-release-gate") || episode.classList.contains("is-unlocked")); }
  function paragraphs(episode) { return Array.from(episode.querySelectorAll(".novel-body > p")); }
  function save(manual = false) {
   const serialized = JSON.stringify(state);
   try {
    if (serialized !== lastSaved) { localStorage.setItem(key,serialized); lastSaved = serialized; document.dispatchEvent(new CustomEvent("yuzu:reader-saved")); }
    if (manual) status.textContent = "しおりを保存しました。次回は「しおりから続きを読む」で戻れます。";
    return true;
   } catch (_) { status.textContent = "今回の表示には反映していますが、このブラウザに読書設定を保存できませんでした。"; return false; }
  }
  function drawResume() {
   page.dataset.readerSize = state.size;
   sizes.forEach(button => button.setAttribute("aria-pressed",String(button.dataset.readerSize === state.size)));
   const last = episodes.find(episode => episode.id === state.episodeId);
   resume.hidden = !unlocked(last);
   if (!resume.hidden) resume.textContent = `🔖 第${YUZU_NOVEL_EPISODES.find(e=>e.id===last.id).number}話のしおりから続きを読む`;
  }
  function openEpisode(episode,index = 0) {
   if (!unlocked(episode)) return;
   suspendUntil = Date.now() + 1000;
   episodes.forEach(other => { if (other !== episode) other.open = false; });
   let ancestor = episode.parentElement;
   while (ancestor && ancestor !== page) { if (ancestor.tagName === "DETAILS") ancestor.open = true; ancestor = ancestor.parentElement; }
   episode.open = true;
   const body = paragraphs(episode); const position = Math.min(Math.max(0,index),Math.max(0,body.length-1));
   state.episodeId = episode.id; state.paragraphIndex = position; drawResume(); save();
   history.replaceState(null,"",`#${episode.id}`);
   requestAnimationFrame(() => {
    const target = position > 0 ? body[position] : episode.querySelector("summary");
    if (!target.matches("summary")) target.setAttribute("tabindex","-1");
    target.scrollIntoView({block:"start",behavior:document.documentElement.dataset.lightMode === "on" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
    target.focus({preventScroll:true});
   });
  }
  function renderChapterNavigation() {
   episodes.forEach((episode,index) => {
    let nav = episode.querySelector(".episode-navigation");
    if (!nav) { nav = document.createElement("nav"); nav.className = "episode-navigation"; nav.setAttribute("aria-label",`第${index+1}話の前後移動`); episode.querySelector(".novel-episode-content").append(nav); }
    nav.replaceChildren();
    const previous = episodes[index-1], next = episodes[index+1];
    if (previous && unlocked(previous)) { const button = document.createElement("button"); button.type="button"; button.textContent=`← 第${index}話へ戻る`; button.addEventListener("click",()=>openEpisode(previous)); nav.append(button); }
    else { const first=document.createElement("span"); first.textContent="ここから物語が始まります"; nav.append(first); }
    if (next && unlocked(next)) { const button = document.createElement("button"); button.type="button"; button.textContent=`第${index+2}話を読む →`; button.addEventListener("click",()=>openEpisode(next)); nav.append(button); }
    else { const end=document.createElement("span"); end.textContent=next ? `第${index+2}話は${next.dataset.releaseDate.replaceAll("-","/")}公開` : "全6話・おしまい。また秘密基地で！"; nav.append(end); }
   });
  }
  function visiblePosition() {
   for (const episode of episodes) {
    if (!episode.open || !unlocked(episode)) continue;
    const body = episode.querySelector(".novel-body"), bounds = body.getBoundingClientRect();
    if (!bounds.height || bounds.bottom <= 90 || bounds.top >= innerHeight - 85) continue;
    const list = paragraphs(episode);
    for (let index=0;index<list.length;index++) { const rect=list[index].getBoundingClientRect(); if (rect.height && rect.bottom>90 && rect.top<innerHeight-85) return {episode,index,count:list.length}; }
   }
   return null;
  }
  function capturePosition(manual = false) {
   if (!manual && Date.now()<suspendUntil) { clearTimeout(scrollTimer); scrollTimer=setTimeout(()=>capturePosition(),suspendUntil-Date.now()+50); return; }
   const found = visiblePosition(); tools.hidden = !found;
   if (!found) return;
   state.episodeId=found.episode.id; state.paragraphIndex=found.index;
   const number=YUZU_NOVEL_EPISODES.find(e=>e.id===found.episode.id).number;
   progress.textContent=`第${number}話・${Math.round((found.index+1)/found.count*100)}%目安`;
   drawResume(); save(manual);
  }
  sizes.forEach(button => button.addEventListener("click",()=>{ state.size=button.dataset.readerSize; drawResume(); save(); }));
  episodes.forEach(episode=>episode.addEventListener("toggle",()=>{
   if (episode.open && unlocked(episode) && state.episodeId!==episode.id && Date.now()>=suspendUntil) { state.episodeId=episode.id; state.paragraphIndex=0; drawResume(); save(); }
   clearTimeout(scrollTimer); scrollTimer=setTimeout(()=>capturePosition(),1100);
  }));
  resume.addEventListener("click",()=>openEpisode(episodes.find(e=>e.id===state.episodeId),state.paragraphIndex));
  mark.addEventListener("click",()=>capturePosition(true));
  window.addEventListener("scroll",()=>{ clearTimeout(scrollTimer); scrollTimer=setTimeout(()=>capturePosition(),600); },{passive:true});
  window.addEventListener("pagehide",()=>{ clearTimeout(scrollTimer); capturePosition(); });
  document.addEventListener("visibilitychange",()=>{if(document.hidden) capturePosition();});
  document.addEventListener("yuzu:novel-release-update",()=>{drawResume();renderChapterNavigation();});
  document.addEventListener("yuzu:preferences-restored",()=>{state=readState();lastSaved="";drawResume();});
  drawResume(); renderChapterNavigation();
  if (new URLSearchParams(location.search).get("resume")==="1") openEpisode(episodes.find(e=>e.id===state.episodeId),state.paragraphIndex);
  else if (/^#novel-episode-[1-6]$/.test(location.hash)) { const target=episodes.find(e=>`#${e.id}`===location.hash); openEpisode(target,target?.id===state.episodeId?state.paragraphIndex:0); }
 }

 setupDestinationSearch();
 setupNovelReader();
 function updatePublicationPlan() {
  const today = getNovelReleaseDateKey();
  document.querySelectorAll("[data-novel-release]").forEach(row => {
   const available = today >= row.dataset.novelRelease;
   row.classList.toggle("is-published", available);
   row.querySelector("[data-novel-release-label]").textContent = available ? "公開中" : "公開予定";
  });
  const status = document.getElementById("novelPublicationStatus");
  if (status) {
   if (today >= "2026-11-01") status.textContent = "全6話公開中・完結。第1話から最終話まで読めます。";
   else if (today >= "2026-10-25") status.textContent = "第1〜5話を公開中。最終話「柚胡椒の秘密基地」は11月1日公開です。";
   else if (today >= "2026-10-18") status.textContent = "第1〜4話を公開中。第5話は10月25日、最終話は11月1日公開です。";
   else status.textContent = "第1〜3話を公開中。第4話は10月18日、第5話は10月25日、最終話は11月1日公開です。";
  }
 }
 updatePublicationPlan();
 document.addEventListener("yuzu:novel-release-update", updatePublicationPlan);
 const refreshButton = document.getElementById("liveRefreshButton");
 if (refreshButton) refreshButton.addEventListener("click", () => checkLiveStatus());
})();
