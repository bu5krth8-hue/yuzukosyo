const YUZU_FAVORITE_ROOMS = [
 {id:"stamp",label:"📮 来場スタンプ",href:"index.html#visitStamp"},
 {id:"fortune",label:"🔮 柚胡椒くじ",href:"index.html#omikuji"},
 {id:"novel",label:"📖 小説",href:"novel.html"},
 {id:"schedule",label:"🔔 配信予定",href:"index.html#schedule"},
 {id:"apps",label:"🧩 アプリ関係",href:"apps.html"},
 {id:"pashayomi",label:"📷 パシャ読み",href:"pashayomi.html"},
 {id:"profile",label:"👤 プロフィール",href:"profile.html"},
 {id:"residents",label:"👻 秘密基地の住人",href:"mascots.html"},
 {id:"quotes",label:"📜 今日の格言",href:"quotes.html"},
 {id:"meigen",label:"🗯️ 迷言集",href:"meigen.html"}
];
const YUZU_NOVEL_EPISODES = [
 {id:"novel-episode-1",number:1,title:"人間世界から落ちてきた箱",date:"2000-01-01"},
 {id:"novel-episode-2",number:2,title:"はじめてのゲーム",date:"2026-06-10"},
 {id:"novel-episode-3",number:3,title:"幽霊、はじめてのクリック",date:"2026-06-30"},
 {id:"novel-episode-4",number:4,title:"秘密基地、配信準備中",date:"2026-10-18"},
 {id:"novel-episode-5",number:5,title:"はじめての配信",date:"2026-10-25"},
 {id:"novel-episode-6",number:6,title:"柚胡椒の秘密基地",date:"2026-11-01"}
];
function normalizeYuzuReaderState(value) {
 const source = value && typeof value === "object" ? value : {};
 const episodeId = YUZU_NOVEL_EPISODES.some(e => e.id === source.episodeId) ? source.episodeId : "";
 return {size:["normal","large","extra"].includes(source.size)?source.size:"normal",episodeId,
  paragraphIndex:episodeId && Number.isInteger(source.paragraphIndex) && source.paragraphIndex >= 0 && source.paragraphIndex < 5000 ? source.paragraphIndex : 0};
}
function normalizeYuzuFavoriteIds(value) {
 return Array.isArray(value) ? Array.from(new Set(value.filter(id => YUZU_FAVORITE_ROOMS.some(room => room.id === id)))).slice(0,4) : [];
}
function getYuzuPreferenceBackup() {
 const result = {};
 for (const key of ["yuzuLightModeV1","yuzuFavoriteRoomsV1","yuzuNovelReaderV1"]) {
  try { const value = localStorage.getItem(key); if (value !== null) result[key] = JSON.parse(value); } catch (_) {}
 }
 return normalizeYuzuPreferenceBackup(result);
}
function normalizeYuzuPreferenceBackup(value) {
 const result = {};
 if (!value || typeof value !== "object") return result;
 if (typeof value.yuzuLightModeV1 === "boolean") result.yuzuLightModeV1 = value.yuzuLightModeV1;
 if (Array.isArray(value.yuzuFavoriteRoomsV1)) result.yuzuFavoriteRoomsV1 = normalizeYuzuFavoriteIds(value.yuzuFavoriteRoomsV1);
 if (value.yuzuNovelReaderV1 && typeof value.yuzuNovelReaderV1 === "object") result.yuzuNovelReaderV1 = normalizeYuzuReaderState(value.yuzuNovelReaderV1);
 return result;
}
(function () {
 "use strict";
 const nav = document.getElementById("shortcutMenuLinks");
 if (!nav) return;
 let favorites = [];
 const load = key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; } };
 const tools = document.createElement("div"); tools.className = "base-personal-tools";
 const light = document.createElement("button"); light.type = "button"; light.className = "light-mode-button";
 const picker = document.createElement("details"); picker.className = "favorite-picker";
 const summary = document.createElement("summary"); summary.textContent = "⭐ よく使う部屋を選ぶ（4つまで）";
 const choices = document.createElement("div"); choices.className = "favorite-choices";
 const note = document.createElement("p"); note.className = "personal-tools-status"; note.setAttribute("role","status");
 YUZU_FAVORITE_ROOMS.forEach(room => {
  const label = document.createElement("label"), input = document.createElement("input");
  input.type = "checkbox"; input.value = room.id;
  label.append(input,document.createTextNode(room.label)); choices.append(label);
  input.addEventListener("change", () => {
   if (input.checked && favorites.length >= 4) { input.checked = false; note.textContent = "お気に入りは4つまでです。ほかのチェックを外してから選んでね。"; return; }
   favorites = normalizeYuzuFavoriteIds(input.checked ? favorites.concat(room.id) : favorites.filter(id => id !== room.id));
   try { localStorage.setItem("yuzuFavoriteRoomsV1",JSON.stringify(favorites)); note.textContent = "お気に入りを保存しました。ホームの「よく使う部屋」から開けます。"; }
   catch (_) { note.textContent = "今回の表示には反映しましたが、このブラウザに保存できませんでした。"; }
   renderFavorites();
  });
 });
 picker.append(summary,choices); tools.append(light,picker,note); nav.append(tools);
 function refreshPreferences() {
  favorites = normalizeYuzuFavoriteIds(load("yuzuFavoriteRoomsV1"));
  document.documentElement.dataset.lightMode = load("yuzuLightModeV1") === true ? "on" : "off";
  light.setAttribute("aria-pressed",String(document.documentElement.dataset.lightMode === "on"));
  light.textContent = document.documentElement.dataset.lightMode === "on" ? "🍃 軽量表示：ON（押すと通常表示）" : "🍃 軽量表示：OFF（押すと軽量表示）";
  choices.querySelectorAll("input").forEach(input => input.checked = favorites.includes(input.value));
  renderFavorites();
 }
 light.addEventListener("click", () => {
  const enabled = document.documentElement.dataset.lightMode !== "on";
  document.documentElement.dataset.lightMode = enabled ? "on" : "off";
  light.setAttribute("aria-pressed",String(enabled));
  light.textContent = enabled ? "🍃 軽量表示：ON（押すと通常表示）" : "🍃 軽量表示：OFF（押すと軽量表示）";
  try { localStorage.setItem("yuzuLightModeV1",JSON.stringify(enabled)); note.textContent = enabled ? "背景の動き・発光を控えめにしました。" : "通常の表示へ戻しました。"; }
  catch (_) { note.textContent = "表示は切り替えましたが、このブラウザに設定を保存できませんでした。"; }
 });
 function renderFavorites() {
  const list = document.getElementById("favoriteRoomLinks"); if (!list) return;
  list.replaceChildren();
  favorites.forEach(id => { const room = YUZU_FAVORITE_ROOMS.find(r => r.id === id); const a = document.createElement("a"); a.href = document.body.id === "top" ? room.href.replace(/^index\.html(?=#)/,"") : room.href; a.textContent = room.label; list.append(a); });
  const empty = document.getElementById("favoriteRoomsEmpty"); if (empty) empty.hidden = favorites.length > 0;
 }
 const edit = document.getElementById("editFavoriteRooms");
 if (edit) edit.addEventListener("click", event => { event.stopPropagation(); const actions = nav.closest(".topbar-actions"); actions.classList.add("is-open"); actions.querySelector(".mobile-shortcut-toggle").setAttribute("aria-expanded","true"); picker.open = true; summary.focus(); });
 function updateToday() {
  const root = document.getElementById("todayBase"); if (!root) return;
  const today = getTodayKey();
  const dateLabel = document.getElementById("todayBaseDate");
  dateLabel.textContent = new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
  let canRead = true; try { localStorage.getItem("yuzukosyoVisitStampsV1"); } catch (_) { canRead = false; }
  const dates = loadVisitStampDates();
  document.getElementById("todayStampSummary").textContent = canRead ? (dates.includes(today) ? `取得済み｜連続${getConsecutiveVisitStreak(new Set(dates),today)}日` : "今日のスタンプを確認しよう") : "このブラウザでは履歴を確認できません";
  let draw = getStoredDailyOmikujiIndex(today);
  if (!Number.isInteger(draw)) draw = loadOmikujiHistory().find(entry => entry.date === today)?.index;
  const item = getOmikujiItemByIndex(draw);
  document.getElementById("todayFortuneSummary").textContent = canRead ? (document.getElementById("omikujiButton")?.textContent.includes("占い中") ? "くじを引いています…" : item ? `「${item.fortune}」取得済み` : "今日はまだ引いていません") : "このブラウザでは履歴を確認できません";
  const available = YUZU_NOVEL_EPISODES.filter(e => e.date <= getNovelReleaseDateKey());
  const latest = available[available.length-1], next = YUZU_NOVEL_EPISODES[available.length];
  const novelLink = document.getElementById("todayNovelLink"); novelLink.href = `novel.html#${latest.id}`;
  document.getElementById("todayNovelSummary").textContent = next ? `第${latest.number}話まで公開中・次は${next.date.slice(5).replace("-","/")}` : "全6話公開中・完結しました";
  const resumeState = normalizeYuzuReaderState(load("yuzuNovelReaderV1"));
  const resumeLink = document.getElementById("todayNovelResume"); resumeLink.hidden = !available.some(e => e.id === resumeState.episodeId);
  const live = document.getElementById("liveBadge");
  const schedule = document.getElementById("scheduleList");
  const firstDate = schedule?.querySelector(".schedule-date");
  const status = document.getElementById("scheduleStatus")?.textContent || "";
  document.getElementById("todayScheduleSummary").textContent = live?.classList.contains("is-live") ? "🔴 現在配信中・配信欄を見てね" : firstDate ? firstDate.textContent.replace(/\s+/g," ").trim() : status.includes("確認中") ? "配信予定を確認中…" : status.includes("まだありません") ? "予定未登録・お知らせはSNSで" : "配信予定・お知らせを確認";
  const messages = ["見ているだけでも大歓迎ぽん。今日もゆっくりしていってね。","冒険の前に、ひと息。今日はどの部屋に行こう？","小説の続きも、くじの結果も、楽しみは自分のペースで。","たぬちゃんは今日も宝箱を探しているらしいぽん。","音量よし、お水よし。秘密基地でひと休みしよう。","初めてでも、いつもの人でも、いらっしゃい。","忙しい日は、スタンプだけでも。また遊びに来てね。"];
  const seed = Array.from(today).reduce((n,c) => n + c.charCodeAt(0),0);
  document.getElementById("todayBaseGreeting").textContent = messages[seed % messages.length];
 }
 let queued = false;
 function queueToday() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; updateToday(); }); }
 if (document.getElementById("todayBase")) {
  const observer = new MutationObserver(queueToday);
  ["stampTodayStatus","stampStreakCount","omikujiButton","scheduleList","scheduleStatus","liveBadge"].forEach(id => { const el=document.getElementById(id); if (el) observer.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","class"]}); });
 }
 document.addEventListener("yuzu:novel-release-update",queueToday);
 document.addEventListener("visibilitychange",() => { if (!document.hidden) queueToday(); });
 document.addEventListener("yuzu:preferences-restored",refreshPreferences);
 document.addEventListener("yuzu:reader-saved",queueToday);
 window.addEventListener("storage",event => { if (["yuzuLightModeV1","yuzuFavoriteRoomsV1"].includes(event.key)) refreshPreferences(); queueToday(); });
 window.addEventListener("pageshow",() => { refreshPreferences(); queueToday(); });
 refreshPreferences(); updateToday();
})();
