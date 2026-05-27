const MEIGEN_STORAGE_KEY = "yuzukosyoMeigenItems";
const MEIGEN_ADMIN_PASS_KEY = "yuzukosyoMeigenAdminPassed";
const MEIGEN_ADMIN_PASSWORD = "5563937564";
const MEIGEN_OWNER_MAIL = "";
const MEIGEN_SUBMISSION_STORAGE_KEY = "yuzukosyoMeigenSubmissions";
const MEIGEN_ADMIN_PAGE = "yuzu-secret-meigen-control-2026.html";
const MEIGEN_SUBMIT_API = "/api/meigen-submit";

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


function meigenBase64UrlEncode(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function meigenBase64UrlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function meigenGetLocalSubmissions() {
  try {
    const raw = localStorage.getItem(MEIGEN_SUBMISSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("投稿案データ読込エラー:", error);
    return [];
  }
}

function meigenSaveLocalSubmissions(items) {
  localStorage.setItem(MEIGEN_SUBMISSION_STORAGE_KEY, JSON.stringify(items));
}

function meigenSubmissionSignature(item) {
  return [
    meigenNormalizeItemValue(item?.text),
    meigenNormalizeItemValue(item?.speaker || "未設定"),
    meigenNormalizeItemValue(item?.place || "未設定"),
    meigenNormalizeItemValue(item?.date || "未設定"),
    meigenNormalizeItemValue(item?.sender || "匿名"),
    meigenNormalizeItemValue(item?.memo || "")
  ].join("|");
}

function meigenNormalizeSubmission(raw) {
  const item = raw && typeof raw === "object" ? raw : {};
  return {
    id: String(item.id || `submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    text: String(item.text || "").trim(),
    speaker: String(item.speaker || "").trim() || "未設定",
    place: String(item.place || "").trim() || "未設定",
    date: String(item.date || "").trim() || "未設定",
    sender: String(item.sender || "").trim() || "匿名",
    memo: String(item.memo || "").trim(),
    createdAt: String(item.createdAt || new Date().toISOString())
  };
}

function meigenAddLocalSubmission(raw) {
  const item = meigenNormalizeSubmission(raw);
  if (!item.text) return false;

  const localItems = meigenGetLocalSubmissions();
  const signature = meigenSubmissionSignature(item);
  const exists = localItems.some((current) =>
    current.id === item.id || meigenSubmissionSignature(current) === signature
  );

  if (!exists) {
    meigenSaveLocalSubmissions([item, ...localItems]);
  }

  return true;
}

function meigenSubmissionToLocalItem(submission, visible) {
  const item = meigenNormalizeSubmission(submission);
  const memoParts = [];
  if (item.sender && item.sender !== "匿名") memoParts.push(`投稿者：${item.sender}`);
  if (item.memo) memoParts.push(item.memo);

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: item.text,
    speaker: item.speaker || "未設定",
    place: item.place || "未設定",
    date: item.date || "未設定",
    memo: memoParts.join(" / "),
    visible: visible === true
  };
}

async function meigenPostRemoteSubmission(item) {
  const response = await fetch(MEIGEN_SUBMIT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.configured === false) {
    throw new Error(data.message || "投稿案の保存に失敗しました。");
  }

  return data;
}

async function meigenFetchRemoteSubmissions() {
  const response = await fetch(MEIGEN_SUBMIT_API, {
    method: "GET",
    headers: { "X-Meigen-Admin": MEIGEN_ADMIN_PASSWORD },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.configured === false) {
    throw new Error(data.message || "投稿案の取得に失敗しました。");
  }

  return Array.isArray(data.items) ? data.items.map(meigenNormalizeSubmission) : [];
}

async function meigenDeleteRemoteSubmission(id) {
  const response = await fetch(MEIGEN_SUBMIT_API, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Meigen-Admin": MEIGEN_ADMIN_PASSWORD
    },
    body: JSON.stringify({ id }),
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.configured === false) {
    throw new Error(data.message || "投稿案の削除に失敗しました。");
  }

  return data;
}

function setupMeigenAdmin() {
  const lock = document.getElementById("meigenAdminLock");
  const panel = document.getElementById("meigenAdminPanel");
  const passInput = document.getElementById("meigenAdminPassword");
  const passBtn = document.getElementById("meigenAdminLoginBtn");
  const passMsg = document.getElementById("meigenAdminMessage");
  const form = document.getElementById("meigenAdminForm");
  const list = document.getElementById("meigenAdminList");
  const submissionList = document.getElementById("meigenSubmissionList");
  const submissionMsg = document.getElementById("meigenSubmissionMessage");
  const exportArea = document.getElementById("meigenExportArea");
  const exportBtn = document.getElementById("meigenExportBtn");
  const resetBtn = document.getElementById("meigenResetBtn");

  if (!lock || !panel || !form || !list) return;

  let adminUnlocked = false;
  let remoteSubmissions = [];
  let remoteReady = false;

  const setPanelInteractive = (enabled) => {
    const controls = panel.querySelectorAll("input, textarea, select, button");
    controls.forEach((control) => {
      control.disabled = !enabled;
    });
    panel.setAttribute("aria-hidden", enabled ? "false" : "true");
  };

  const isAdminUnlocked = () => adminUnlocked === true && sessionStorage.getItem(MEIGEN_ADMIN_PASS_KEY) === "true";

  const showSubmissionMessage = (message) => {
    if (submissionMsg) submissionMsg.textContent = message || "";
  };

  const consumeIncomingSubmission = () => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("submit");
    const posted = params.get("posted");

    if (encoded) {
      try {
        const item = meigenNormalizeSubmission(JSON.parse(meigenBase64UrlDecode(encoded)));
        if (meigenAddLocalSubmission(item) && passMsg) {
          passMsg.textContent = "投稿案を受け付けました。管理者が確認します。";
        }
      } catch (error) {
        if (passMsg) passMsg.textContent = "投稿案の読み込みに失敗しました。";
      }

      window.history.replaceState({}, document.title, MEIGEN_ADMIN_PAGE);
      return;
    }

    if (posted && passMsg) {
      passMsg.textContent = "投稿案を受け付けました。管理者が確認します。";
      window.history.replaceState({}, document.title, MEIGEN_ADMIN_PAGE);
    }
  };

  const allSubmissions = () => {
    const merged = [];
    const seen = new Set();
    const pushItem = (item, source) => {
      const normalized = meigenNormalizeSubmission(item);
      if (!normalized.text) return;
      const key = normalized.id || meigenSubmissionSignature(normalized);
      const signature = meigenSubmissionSignature(normalized);
      if (seen.has(key) || seen.has(signature)) return;
      seen.add(key);
      seen.add(signature);
      merged.push({ ...normalized, source });
    };

    remoteSubmissions.forEach((item) => pushItem(item, "remote"));
    meigenGetLocalSubmissions().forEach((item) => pushItem(item, "local"));
    return merged;
  };

  const renderSubmissionList = () => {
    if (!submissionList) return;
    const submissions = allSubmissions();

    if (!submissions.length) {
      const suffix = remoteReady ? "" : " 受信APIが未設定の場合は、この端末に届いた投稿案だけ表示されます。";
      submissionList.innerHTML = `<div class="empty-meigen-box">投稿案はまだありません。${suffix}</div>`;
      return;
    }

    submissionList.innerHTML = submissions.map((item) => {
      const received = item.createdAt ? new Date(item.createdAt).toLocaleString("ja-JP") : "未設定";
      return `
        <article class="admin-meigen-item admin-submission-item">
          <div>
            <strong>“${meigenEscapeHtml(item.text)}”</strong>
            <p>${meigenEscapeHtml(item.speaker || "未設定")} / ${meigenEscapeHtml(item.place || "未設定")} / ${meigenEscapeHtml(item.date || "未設定")}</p>
            <p>投稿者：${meigenEscapeHtml(item.sender || "匿名")} / 受付：${meigenEscapeHtml(received)}</p>
            ${item.memo ? `<p>補足：${meigenEscapeHtml(item.memo)}</p>` : ""}
            <small>${item.source === "remote" ? "投稿フォーム受信" : "この端末に保存"}</small>
          </div>
          <div class="admin-meigen-actions">
            <button type="button" data-action="accept-public" data-source="${meigenEscapeHtml(item.source)}" data-id="${meigenEscapeHtml(item.id)}">公開で追加</button>
            <button type="button" data-action="accept-private" data-source="${meigenEscapeHtml(item.source)}" data-id="${meigenEscapeHtml(item.id)}">非公開で保存</button>
            <button type="button" data-action="delete-submission" data-source="${meigenEscapeHtml(item.source)}" data-id="${meigenEscapeHtml(item.id)}">削除</button>
          </div>
        </article>
      `;
    }).join("");
  };

  const refreshRemoteSubmissions = async () => {
    if (!isAdminUnlocked()) return;
    try {
      remoteSubmissions = await meigenFetchRemoteSubmissions();
      remoteReady = true;
      showSubmissionMessage("");
    } catch (error) {
      remoteReady = false;
      showSubmissionMessage("投稿受信APIが未設定、または取得できません。この端末内の投稿案だけ表示します。");
    }
    renderSubmissionList();
  };

  const removeSubmission = async (source, id) => {
    if (source === "remote") {
      await meigenDeleteRemoteSubmission(id);
      remoteSubmissions = remoteSubmissions.filter((item) => item.id !== id);
    } else {
      meigenSaveLocalSubmissions(meigenGetLocalSubmissions().filter((item) => item.id !== id));
    }
  };

  const openPanel = () => {
    adminUnlocked = true;
    lock.hidden = true;
    panel.hidden = false;
    setPanelInteractive(true);
    renderAdminList();
    renderSubmissionList();
    refreshRemoteSubmissions();
  };

  const showLock = () => {
    adminUnlocked = false;
    lock.hidden = false;
    panel.hidden = true;
    setPanelInteractive(false);
  };

  consumeIncomingSubmission();
  showLock();
  if (sessionStorage.getItem(MEIGEN_ADMIN_PASS_KEY) === "true") openPanel();

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

  if (passInput) {
    passInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") passBtn?.click();
    });
  }

  function renderAdminList() {
    const localItems = meigenGetLocalItems();
    if (!localItems.length) {
      list.innerHTML = `<div class="empty-meigen-box">管理中の迷言はまだありません。上のフォームから追加してね。</div>`;
      return;
    }

    list.innerHTML = localItems.map((item) => `
      <article class="admin-meigen-item ${item.visible === false ? "is-hidden" : ""}">
        <div>
          <strong>“${meigenEscapeHtml(item.text)}”</strong>
          <p>${meigenEscapeHtml(item.speaker || "未設定")} / ${meigenEscapeHtml(item.place || "未設定")} / ${meigenEscapeHtml(item.date || "未設定")}</p>
          ${item.memo ? `<p>${meigenEscapeHtml(item.memo)}</p>` : ""}
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
    if (!isAdminUnlocked()) {
      showLock();
      return;
    }
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
    if (!isAdminUnlocked()) {
      showLock();
      return;
    }
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

  if (submissionList) {
    submissionList.addEventListener("click", async (event) => {
      if (!isAdminUnlocked()) {
        showLock();
        return;
      }
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const source = button.dataset.source;
      const id = button.dataset.id;
      const target = allSubmissions().find((item) => item.id === id && item.source === source);
      if (!target) return;

      button.disabled = true;
      showSubmissionMessage("処理中です…");

      try {
        if (action === "delete-submission") {
          if (!confirm("この投稿案を削除しますか？")) {
            button.disabled = false;
            showSubmissionMessage("");
            return;
          }
          await removeSubmission(source, id);
          showSubmissionMessage("投稿案を削除しました。");
        }

        if (action === "accept-public" || action === "accept-private") {
          const visible = action === "accept-public";
          const localItems = meigenGetLocalItems();
          meigenSaveLocalItems([meigenSubmissionToLocalItem(target, visible), ...localItems]);
          await removeSubmission(source, id);
          showSubmissionMessage(visible ? "投稿案を公開状態で管理リストへ追加しました。" : "投稿案を非公開状態で管理リストへ保存しました。");
          renderAdminList();
        }
      } catch (error) {
        showSubmissionMessage("処理に失敗しました。時間をおいてもう一度試してください。");
      }

      renderSubmissionList();
    });
  }

  if (exportBtn && exportArea) {
    exportBtn.addEventListener("click", () => {
      if (!isAdminUnlocked()) {
        showLock();
        return;
      }
      const visibleItems = meigenVisibleItems();
      const exportText = `window.YUZUKOSYO_PUBLIC_MEIGEN = ${JSON.stringify(visibleItems, null, 2)};`;
      exportArea.value = exportText;
      exportArea.focus();
      exportArea.select();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!isAdminUnlocked()) {
        showLock();
        return;
      }
      if (!confirm("この端末に保存した迷言を全て消しますか？")) return;
      localStorage.removeItem(MEIGEN_STORAGE_KEY);
      localStorage.removeItem(MEIGEN_SUBMISSION_STORAGE_KEY);
      renderAdminList();
      renderSubmissionList();
    });
  }
}

function setupMeigenSubmitForm() {
  const form = document.getElementById("meigenSubmitForm");
  const sendBtn = document.getElementById("meigenSubmitSendBtn");
  const status = document.getElementById("meigenSubmitStatus");
  if (!form) return;

  const setStatus = (message) => {
    if (status) status.textContent = message || "";
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const item = meigenNormalizeSubmission({
      id: `submit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: data.get("text"),
      speaker: data.get("speaker"),
      place: data.get("place"),
      date: data.get("date"),
      sender: data.get("sender"),
      memo: data.get("memo"),
      createdAt: new Date().toISOString()
    });

    if (!item.text) {
      setStatus("迷言を入力してください。");
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = "送信中…";
    }
    setStatus("投稿案を送信しています…");

    try {
      await meigenPostRemoteSubmission(item);
      window.location.href = `${MEIGEN_ADMIN_PAGE}?posted=1#meigenSubmissionCard`;
    } catch (error) {
      const encoded = meigenBase64UrlEncode(JSON.stringify(item));
      window.location.href = `${MEIGEN_ADMIN_PAGE}?submit=${encoded}#meigenSubmissionCard`;
    }
  });
}

renderMeigenList();
setupMeigenAdmin();
setupMeigenSubmitForm();
