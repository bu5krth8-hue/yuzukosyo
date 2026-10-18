/* Keep a downloadable copy outside browser site data. No account or server upload. */
function createHistoryBackupFile() {
 return JSON.stringify({
  format: "yuzukosyo-history-backup",
  version: 1,
  createdAt: new Date().toISOString(),
  payload: encodeVisitStampBackupPayload(loadVisitStampDates(), loadOmikujiHistory()),
  preferences: typeof getYuzuPreferenceBackup === "function" ? getYuzuPreferenceBackup() : {}
 }, null, 2);
}
function prepareHistoryFileRestore(text) {
 const data = JSON.parse(text);
 if (!data || data.format !== "yuzukosyo-history-backup" || data.version !== 1 ||
     typeof data.payload !== "string" || data.payload.length > 512000) {
  throw new Error("秘密基地で保存した履歴ファイル（.json）を選んでください。");
 }
 const bundle = decodeVisitStampBackupBundle(data.payload);
 const preferences = typeof normalizeYuzuPreferenceBackup === "function" ? normalizeYuzuPreferenceBackup(data.preferences) : {};
 if (!bundle.dates.length && !bundle.omikujiEntries.length && !Object.keys(preferences).length) {
  throw new Error("復元できる履歴がありません。保存期間外、またはファイルが壊れている可能性があります。");
 }
 const currentDates = loadVisitStampDates();
 const currentEntries = loadOmikujiHistory();
 const currentDays = new Set(currentEntries.map(entry => entry.date));
 const extraEntries = bundle.omikujiEntries.filter(entry => !currentDays.has(entry.date));
 const dates = pruneVisitStampDatesToRetention([...currentDates, ...bundle.dates]);
 const entries = mergeOmikujiHistoryEntries([...currentEntries, ...extraEntries]);
 return { dates, entries, addedStamps: dates.length - currentDates.length, addedDraws: extraEntries.length, preferences };
}
function applyHistoryFileRestore(plan) {
 const writes = [
  [VISIT_STAMP_STORAGE_KEY, JSON.stringify(plan.dates)],
  [OMIKUJI_HISTORY_STORAGE_KEY, JSON.stringify(plan.entries)]
 ];
 const today = plan.entries.find(entry => entry.date === getTodayKey());
 if (today && !Number.isInteger(getStoredDailyOmikujiIndex(getTodayKey()))) {
  writes.push([OMIKUJI_DAILY_STORAGE_KEY, JSON.stringify({ date:today.date, index:today.index })]);
 }
 for (const [key,value] of Object.entries(plan.preferences || {})) {
  if (localStorage.getItem(key) === null) writes.push([key,JSON.stringify(value)]);
 }
 const previous = writes.map(([key]) => [key, localStorage.getItem(key)]);
 let changed = 0;
 try {
  for (const [key, value] of writes) { localStorage.setItem(key, value); changed++; }
 } catch (error) {
  for (let i = changed - 1; i >= 0; i--) {
   try { const [key, value] = previous[i]; if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (_) {}
  }
  throw new Error("このブラウザに履歴を保存できませんでした。サイトデータの保存設定や空き容量を確認してください。");
 }
}
function setupHistoryFileBackup() {
 document.querySelectorAll(".stamp-backup-panel:not(.arrival-stamp-backup)").forEach(panel => {
  const status = panel.querySelector(".stamp-backup-status");
  const help = document.createElement("p");
  help.className = "history-backup-help";
  help.textContent = "サイトデータを消す前に「履歴をファイルに保存」。消えたら「保存した履歴を戻す」で、そのファイルを選んでね。新しいファイルには、お気に入り・読書しおり・軽量表示の設定も含みます。復元リンクはスタンプとくじのみです。";
  const actions = document.createElement("div");
  actions.className = "history-file-actions";
  const save = document.createElement("button");
  save.type = "button"; save.className = "mini-btn"; save.textContent = "💾 履歴をファイルに保存";
  const restore = document.createElement("button");
  restore.type = "button"; restore.className = "mini-btn"; restore.textContent = "📂 保存した履歴を戻す";
  const picker = document.createElement("input");
  picker.type = "file"; picker.accept = ".json,application/json"; picker.hidden = true;
  save.addEventListener("click", () => {
   try {
    downloadBlobFile(new Blob([createHistoryBackupFile()], {type:"application/json;charset=utf-8"}), `yuzukosyo-history-${getTodayKey()}.json`);
    if (status) status.textContent = "保存先を確認してください。iPhoneでは「ファイル」アプリなど、ブラウザの外に保存してね。スタンプが増えたら、また保存してください。";
   } catch (_) { if (status) status.textContent = "ファイルを作れませんでした。復元リンクをコピーして保存してください。"; }
  });
  restore.addEventListener("click", () => picker.click());
  picker.addEventListener("change", async () => {
   const file = picker.files && picker.files[0];
   if (!file) return;
   restore.disabled = true;
   try {
    if (file.size > 512000) throw new Error("履歴ファイルのサイズが大きすぎます。秘密基地で保存した.jsonファイルを選んでください。");
    const plan = prepareHistoryFileRestore(await file.text());
    if (!window.confirm(`保存した履歴を追加しますか？\n新しく戻せるスタンプ：${plan.addedStamps}日分\n新しく戻せるくじ：${plan.addedDraws}件\n現在の履歴と同じ日のくじ結果は、そのまま残します。`)) {
     if (status) status.textContent = "復元をキャンセルしました。現在の履歴はそのままです。";
     return;
    }
    applyHistoryFileRestore(plan);
    document.dispatchEvent(new CustomEvent("yuzu:preferences-restored"));
    refreshDailyOmikujiStateFromHistory();
    refreshVisitStampViewsForCurrentDay({force:true});
    setupOmikujiHistoryPage();
    if (status) status.textContent = `復元しました。スタンプ${plan.dates.length}日分・くじ${plan.entries.length}件。現在の履歴と合体して保存しました。`;
   } catch (error) {
    if (status) status.textContent = error instanceof SyntaxError ? "ファイルを読み取れませんでした。秘密基地で保存した.jsonファイルを選んでください。" : error.message;
   } finally { picker.value = ""; restore.disabled = false; }
  });
  actions.append(save, restore, picker);
  panel.insertBefore(help, status);
  panel.insertBefore(actions, status);
 });
}
setupHistoryFileBackup();
