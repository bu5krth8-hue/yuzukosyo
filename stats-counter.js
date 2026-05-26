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
      noteEl.textContent = note || "秘密基地に来てくれた人数を自動カウント中。";
    }
  }

  async function runCounter() {
    writeCount(0, "来場者数を確認中…");

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
        writeCount(Number(data.total), "秘密基地に来てくれた人数を自動カウント中。");
        return;
      }

      writeCount(0, data && data.message ? data.message : "来場者数を取得できませんでした。");
    } catch (error) {
      writeCount(0, "来場者数の取得に失敗しました。");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runCounter);
  } else {
    runCounter();
  }
})();
