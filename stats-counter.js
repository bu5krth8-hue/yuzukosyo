(function () {
 const API_URL = "/api/stats";
 function writeCount(total, note) {
  const countEl = document.getElementById("totalAccessCount");
  const noteEl = document.getElementById("accessNote");
  const n = Number(total);
  if (countEl) {
   countEl.textContent = Number.isFinite(n) ? n.toLocaleString("ja-JP") : "0";
  }
  if (noteEl) {
   noteEl.textContent = "";
  }
 }
 async function runCounter() {
  writeCount(0, "");
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
   writeCount(0, "");
  } catch (error) {
   writeCount(0, "");
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
