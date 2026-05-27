const MEIGEN_STORAGE_KEY = "yuzukosyoMeigenItems";
const MEIGEN_ADMIN_PASS_KEY = "yuzukosyoMeigenAdminPassed";
const MEIGEN_ADMIN_PASSWORD = "5563937564";
const MEIGEN_OWNER_MAIL = "";

function meigenEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function meigenGetLocalItems() {
  try {
    const raw = localStorage.getItem(MEIGEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("迷言データ読込エラー:", error);
    return [];
  }
}

function meigenSaveLocalItems(items) {
  localStorage.setItem(MEIGEN_STORAGE_KEY, JSON.stringify(items));
}

function meigenNormalizeItemValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function meigenItemSignature(item) {
  return [
    meigenNormalizeItemValue(item?.text),
    meigenNormalizeItemValue(item?.speaker || "未設定"),
    meigenNormalizeItemValue(item?.place || "未設定"),
    meigenNormalizeItemValue(item?.date || "未設定")
  ].join("|");
}

function meigenAllItems() {
  const publicItems = Array.isArray(window.YUZUKOSYO_PUBLIC_MEIGEN) ? window.YUZUKOSYO_PUBLIC_MEIGEN : [];
  const localItems = meigenGetLocalItems();
  const seen = new Set();

  return [...publicItems, ...localItems].filter((item) => {
    const signature = meigenItemSignature(item);
    if (!signature.trim() || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function meigenVisibleItems() {
  return meigenAllItems().filter((item) =>
    item &&
    item.visible !== false &&
    String(item.text || "").trim()
  );
}

function meigenTodayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function meigenGetDailyItem(items) {
  const todayKey = meigenTodayKey();
  const storageKey = "yuzukosyoDailyMeigen";
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    saved = null;
  }

  if (saved && saved.date === todayKey) {
    if (saved.id) {
      const savedItem = items.find((item) => item.id === saved.id);
      if (savedItem) return savedItem;
    }

    if (Number.isInteger(saved.index) && items[saved.index]) {
      return items[saved.index];
    }
  }

  const index = Math.floor(Math.random() * items.length);
  const item = items[index];

  try {
    localStorage.setItem(storageKey, JSON.stringify({
      date: todayKey,
      index,
      id: item.id || ""
    }));
  } catch (error) {
    // localStorageが使えない環境でも表示は続ける
  }

  return item;
}

function meigenCardTemplate(item) {
  return `
    <div class="quote-item meigen-item" data-meigen-id="${meigenEscapeHtml(item.id)}">
      <p>“${meigenEscapeHtml(item.text || "未入力")}”</p>
      <dl>
        <div><dt>発言者</dt><dd>${meigenEscapeHtml(item.speaker || "未設定")}</dd></div>
        <div><dt>場所</dt><dd>${meigenEscapeHtml(item.place || "未設定")}</dd></div>
        <div><dt>日付</dt><dd>${meigenEscapeHtml(item.date || "未設定")}</dd></div>
      </dl>
      ${item.memo ? `<span class="meigen-card-memo">${meigenEscapeHtml(item.memo)}</span>` : ""}
    </div>
  `;
}

function renderMeigenList() {
  const list = document.getElementById("meigenArchiveList");
  const count = document.getElementById("meigenCount");
  const random = document.getElementById("meigenRandomText");
  const items = meigenVisibleItems();

  if (count) count.textContent = `${items.length}件公開中`;

  if (list) {
    if (!items.length) {
      list.innerHTML = `<div class="empty-meigen-box">公開中の迷言はまだありません。追加されたらここに並ぶよ。</div>`;
    } else {
      list.innerHTML = items.map(meigenCardTemplate).join("");
    }
  }

  if (random) {
    if (!items.length) {
      random.textContent = "今日の迷言を準備中…";
    } else {
      const item = meigenGetDailyItem(items);
      const speaker = item.speaker || "未設定";
      const place = item.place ? ` / ${item.place}` : "";
      random.innerHTML = `“${meigenEscapeHtml(item.text)}”<small>${meigenEscapeHtml(speaker + place)}</small>`;
    }
  }
}

function setupMeigenAdmin() {
  const lock = document.getElementById("meigenAdminLock");
  const panel = document.getElementById("meigenAdminPanel");
  const passInput = document.getElementById("meigenAdminPassword");
  const passBtn = document.getElementById("meigenAdminLoginBtn");
  const passMsg = document.getElementById("meigenAdminMessage");
  const form = document.getElementById("meigenAdminForm");
  const list = document.getElementById("meigenAdminList");
  const exportArea = document.getElementById("meigenExportArea");
  const exportBtn = document.getElementById("meigenExportBtn");
  const resetBtn = document.getElementById("meigenResetBtn");

  if (!lock || !panel || !form || !list) return;

  const openPanel = () => {
    lock.hidden = true;
    panel.hidden = false;
    renderAdminList();
  };

  const showLock = () => {
    lock.hidden = false;
    panel.hidden = true;
  };

  if (sessionStorage.getItem(MEIGEN_ADMIN_PASS_KEY) === "true") openPanel();
  else showLock();

  if (passBtn) {
    passBtn.addEventListener("click", () => {
      if ((passInput?.value || "").trim() === MEIGEN_ADMIN_PASSWORD) {
        sessionStorage.setItem(MEIGEN_ADMIN_PASS_KEY, "true");
        openPanel();
      } else if (passMsg) {
        passMsg.textContent = "パスワードが違います。";
      }
    });
  }

  function renderAdminList() {
    const localItems = meigenGetLocalItems();
    if (!localItems.length) {
      list.innerHTML = `<div class="empty-meigen-box">管理中の迷言はまだありません。下のフォームから追加してね。</div>`;
      return;
    }

    list.innerHTML = localItems.map((item) => `
      <article class="admin-meigen-item ${item.visible === false ? "is-hidden" : ""}">
        <div>
          <strong>“${meigenEscapeHtml(item.text)}”</strong>
          <p>${meigenEscapeHtml(item.speaker || "未設定")} / ${meigenEscapeHtml(item.place || "未設定")} / ${meigenEscapeHtml(item.date || "未設定")}</p>
          <small>${item.visible === false ? "非公開" : "公開"}</small>
        </div>
        <div class="admin-meigen-actions">
          <button type="button" data-action="toggle" data-id="${meigenEscapeHtml(item.id)}">${item.visible === false ? "公開する" : "非公開"}</button>
          <button type="button" data-action="edit" data-id="${meigenEscapeHtml(item.id)}">編集</button>
          <button type="button" data-action="delete" data-id="${meigenEscapeHtml(item.id)}">削除</button>
        </div>
      </article>
    `).join("");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const editId = formData.get("editId");
    const item = {
      id: editId || `local-${Date.now()}`,
      text: String(formData.get("text") || "").trim(),
      speaker: String(formData.get("speaker") || "").trim() || "未設定",
      place: String(formData.get("place") || "").trim() || "未設定",
      date: String(formData.get("date") || "").trim() || "未設定",
      memo: String(formData.get("memo") || "").trim(),
      visible: formData.get("visible") === "true"
    };

    if (!item.text) return;

    const localItems = meigenGetLocalItems();
    const nextItems = editId
      ? localItems.map((current) => current.id === editId ? item : current)
      : [item, ...localItems];

    meigenSaveLocalItems(nextItems);
    form.reset();
    form.querySelector("[name='editId']").value = "";
    form.querySelector("[name='visible']").value = "true";
    renderAdminList();
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const localItems = meigenGetLocalItems();
    const target = localItems.find((item) => item.id === id);
    if (!target) return;

    if (action === "toggle") {
      target.visible = target.visible === false;
      meigenSaveLocalItems(localItems);
      renderAdminList();
    }

    if (action === "delete") {
      if (!confirm("この迷言を削除しますか？")) return;
      meigenSaveLocalItems(localItems.filter((item) => item.id !== id));
      renderAdminList();
    }

    if (action === "edit") {
      form.querySelector("[name='editId']").value = target.id;
      form.querySelector("[name='text']").value = target.text || "";
      form.querySelector("[name='speaker']").value = target.speaker || "";
      form.querySelector("[name='place']").value = target.place || "";
      form.querySelector("[name='date']").value = target.date || "";
      form.querySelector("[name='memo']").value = target.memo || "";
      form.querySelector("[name='visible']").value = target.visible === false ? "false" : "true";
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  if (exportBtn && exportArea) {
    exportBtn.addEventListener("click", () => {
      const visibleItems = meigenGetLocalItems().filter((item) => item.visible !== false);
      const exportText = `window.YUZUKOSYO_PUBLIC_MEIGEN = ${JSON.stringify(visibleItems, null, 2)};`;
      exportArea.value = exportText;
      exportArea.focus();
      exportArea.select();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("この端末に保存した迷言を全て消しますか？")) return;
      localStorage.removeItem(MEIGEN_STORAGE_KEY);
      renderAdminList();
    });
  }
}

function setupMeigenSubmitForm() {
  const form = document.getElementById("meigenSubmitForm");
  const output = document.getElementById("meigenSubmitOutput");
  const copyBtn = document.getElementById("meigenSubmitCopyBtn");
  const mailBtn = document.getElementById("meigenSubmitMailBtn");
  if (!form || !output) return;

  let currentText = "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    currentText = [
      "柚胡椒の迷言集 投稿案",
      "",
      `迷言：${data.get("text") || ""}`,
      `発言者：${data.get("speaker") || ""}`,
      `出た場所：${data.get("place") || ""}`,
      `日付：${data.get("date") || ""}`,
      `投稿者名：${data.get("sender") || ""}`,
      "",
      `補足：${data.get("memo") || ""}`
    ].join("\n");

    output.value = currentText;
    output.closest(".submit-output-card")?.removeAttribute("hidden");

    if (mailBtn) {
      if (MEIGEN_OWNER_MAIL) {
        const subject = encodeURIComponent("柚胡椒の迷言集 投稿案");
        const body = encodeURIComponent(currentText);
        mailBtn.href = `mailto:${MEIGEN_OWNER_MAIL}?subject=${subject}&body=${body}`;
        mailBtn.removeAttribute("aria-disabled");
      } else {
        mailBtn.href = "#";
        mailBtn.setAttribute("aria-disabled", "true");
      }
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!currentText) return;
      try {
        await navigator.clipboard.writeText(currentText);
        copyBtn.textContent = "コピー済み";
        setTimeout(() => copyBtn.textContent = "内容をコピー", 1400);
      } catch (error) {
        output.focus();
        output.select();
      }
    });
  }
}

renderMeigenList();
setupMeigenAdmin();
setupMeigenSubmitForm();
