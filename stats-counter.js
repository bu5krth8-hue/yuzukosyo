(function () {
 const API_URL = "/api/stats";
 function writeCount(total, note) {
  const countEl = document.getElementById("totalAccessCount");
  const noteEl = document.getElementById("accessNote");
  const n = Number(total);
  if (countEl) {
   countEl.textContent = total != null && Number.isFinite(n) ? n.toLocaleString("ja-JP") : "—";
   countEl.setAttribute("aria-label", note || `来場者数 ${n.toLocaleString("ja-JP")}人`);
  }
  if (noteEl) {
   noteEl.textContent = note || "";
  }
 }
 async function runCounter() {
  writeCount(null, "来場者数を読み込み中");
  try {
   const response = await fetch(`${API_URL}?v=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
     "Accept": "application/json"
    }
   });
   const data = await response.json();
   if (data && data.configured === true && Number.isFinite(Number(data.total))) {
    writeCount(Number(data.total), "");
    return;
   }
   writeCount(null, "来場者数を取得できませんでした");
  } catch (error) {
   writeCount(null, "来場者数を取得できませんでした");
  }
 }
 function scheduleCounter() {
  const start = () => runCounter();
  if ("requestIdleCallback" in window) {
   window.requestIdleCallback(start, { timeout: 1800 });
   return;
  }
  window.setTimeout(start, 1200);
 }
 if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleCounter);
 } else {
  scheduleCounter();
 }
})();
