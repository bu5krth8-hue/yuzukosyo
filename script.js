const TWITCH_FUNCTION_URL = "/api/twitch";

async function checkLiveStatus() {
  try {
    const response = await fetch(TWITCH_FUNCTION_URL, { cache: "no-store" });
    const data = await response.json();

    updateLiveArea(data);
    updateScheduleArea(data);

  } catch (error) {

    console.error("Twitch取得エラー:", error);

    showLiveError();
    showScheduleError();

  }
}

function updateLiveArea(data) {

  const liveBadge = document.getElementById("liveBadge");
  const liveBadgeText = document.getElementById("liveBadgeText");
  const liveDetail = document.getElementById("liveDetail");
  const todayGame = document.getElementById("todayGame");
  const twitchSwitch = document.getElementById("twitchSwitch");
  const twitchSwitchText = document.getElementById("twitchSwitchText");
  const liveThumb = document.getElementById("liveThumb");
  const scheduleBtn = document.querySelector(".schedule-btn");

  if (!liveBadge || !liveBadgeText || !liveDetail || !todayGame || !twitchSwitchText || !liveThumb) return;

  if (data.isLive && data.stream) {

    const stream = data.stream;

    liveBadge.classList.remove("is-checking", "is-offline");
    liveBadge.classList.add("is-live");

    if (scheduleBtn) scheduleBtn.classList.add("is-live");
    if (twitchSwitch) twitchSwitch.classList.add("is-live");

    liveBadgeText.innerText = "🔴 LIVE配信中";

    liveDetail.innerHTML = `
      ${escapeHtml(stream.title || "配信中")}<br>
      👀 ${stream.viewerCount ?? 0}人視聴中
    `;

    todayGame.innerHTML = `
      🎮 今日のゲーム：${escapeHtml(stream.gameName || "未設定")}
    `;

    twitchSwitchText.innerText = "LIVE中！";

    if (stream.thumbnailUrl) {

      liveThumb.src = `${stream.thumbnailUrl}?t=${Date.now()}`;

      liveThumb.hidden = false;

    } else {

      liveThumb.hidden = true;

    }

  } else {

    liveBadge.classList.remove("is-checking", "is-live");
    liveBadge.classList.add("is-offline");

    if (scheduleBtn) scheduleBtn.classList.remove("is-live");
    if (twitchSwitch) twitchSwitch.classList.remove("is-live");

    liveBadgeText.innerText = "⚫ OFFLINE";

    liveDetail.innerText = "現在オフラインです";

    todayGame.innerHTML = "🎮 今日のゲーム：未定";

    twitchSwitchText.innerText = "現在オフライン";

    liveThumb.hidden = true;

  }

}

function updateScheduleArea(data) {

  const scheduleStatus = document.getElementById("scheduleStatus");
  const scheduleList = document.getElementById("scheduleList");
  const scheduleNote = document.getElementById("scheduleNote");

  if (!scheduleStatus || !scheduleList || !scheduleNote) return;

  if (!data.scheduleConfigured) {

    scheduleStatus.innerText = "Twitch予定を取得できませんでした";

    scheduleList.innerHTML = `
      <li>
        <span class="schedule-title">予定取得の準備中</span>
        <span class="schedule-category">
          Twitch側で予定を登録すると、ここに自動表示できるよ。
        </span>
      </li>
    `;

    scheduleNote.innerText =
      data.scheduleMessage || "予定はX・Discordでもお知らせします。";

    return;

  }

  const segments = Array.isArray(data.schedule)
    ? data.schedule
    : [];

  if (segments.length === 0) {

    scheduleStatus.innerText =
      "Twitchに登録済みの予定はまだありません";

    scheduleList.innerHTML = `
      <li>
        <span class="schedule-title">予定未登録</span>
        <span class="schedule-category">
          配信予定はX・Discordでもお知らせするよ。
        </span>
      </li>
    `;

    scheduleNote.innerText =
      "Twitchの配信スケジュールに予定を入れると、ここへ自動反映されます。";

    return;

  }

  scheduleStatus.innerText = "Twitchの配信予定";

  scheduleList.innerHTML = segments.map((item) => {

    const startText = formatScheduleDate(item.startTime);

    const title = item.title || "配信予定";

    const category = item.category || "カテゴリ未設定";

    return `
      <li>
        <span class="schedule-date">
          ${escapeHtml(startText)}
        </span>

        <span class="schedule-title">
          ${escapeHtml(title)}
        </span>

        <span class="schedule-category">
          🎮 ${escapeHtml(category)}
        </span>
      </li>
    `;

  }).join("");

  scheduleNote.innerText =
    "予定変更はTwitch・X・Discordで確認してね。";

}

function showLiveError() {

  const liveBadgeText = document.getElementById("liveBadgeText");
  const liveDetail = document.getElementById("liveDetail");
  const todayGame = document.getElementById("todayGame");
  const twitchSwitchText = document.getElementById("twitchSwitchText");
  const liveThumb = document.getElementById("liveThumb");

  if (liveBadgeText)
    liveBadgeText.innerText = "⚠️ 確認失敗";

  if (liveDetail)
    liveDetail.innerText =
      "Twitchの配信状態を取得できませんでした";

  if (todayGame)
    todayGame.innerHTML =
      "🎮 今日のゲーム：確認失敗";

  if (twitchSwitchText)
    twitchSwitchText.innerText =
      "配信状態を確認できません";

  if (liveThumb)
    liveThumb.hidden = true;

}

function showScheduleError() {

  const scheduleStatus = document.getElementById("scheduleStatus");
  const scheduleList = document.getElementById("scheduleList");
  const scheduleNote = document.getElementById("scheduleNote");

  if (scheduleStatus)
    scheduleStatus.innerText =
      "配信予定を取得できませんでした";

  if (scheduleList) {

    scheduleList.innerHTML = `
      <li>
        <span class="schedule-title">取得エラー</span>
        <span class="schedule-category">
          時間をおいて再読み込みしてね。
        </span>
      </li>
    `;

  }

  if (scheduleNote)
    scheduleNote.innerText =
      "Twitch予定が取れない場合はX・Discordを確認してね。";

}

function formatScheduleDate(value) {

  if (!value) return "日時未定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime()))
    return "日時未定";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

}

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// キャラ切り替え
const ghostMascot = document.getElementById("ghostMascot");
const tanuMascot = document.getElementById("tanuMascot");
const ghostBubble = document.getElementById("ghostBubble");
const tanuBubble = document.getElementById("tanuBubble");

const ghostFaces = [
  {
    src: "assets/ghost.webp",
    text: "Xでお知らせ出すから見てね！"
  },
  {
    src: "assets/ghost-wink.webp",
    text: "コメントくれるとめっちゃ嬉しいよ〜！"
  }
];

const tanuFaces = [
  {
    src: "assets/tanuchan.webp",
    text: "Discordでも待ってるよ〜！"
  },
  {
    src: "assets/tanuchan-wink.webp",
    text: "応援ほんとにありがとうぽん！"
  },
  {
    src: "assets/tanuchan-happy.webp",
    text: "秘密基地でのんびりしてってね！"
  }
];

let faceIndex = 0;

function rotateMascots() {

  if (
    !ghostMascot ||
    !tanuMascot ||
    !ghostBubble ||
    !tanuBubble
  ) return;

  faceIndex =
    (faceIndex + 1) % ghostFaces.length;

  ghostMascot.src =
    ghostFaces[faceIndex].src;

  ghostBubble.innerText =
    ghostFaces[faceIndex].text;

  tanuMascot.src =
    tanuFaces[faceIndex].src;

  tanuBubble.innerText =
    tanuFaces[faceIndex].text;

}

function startTwitchStatusPolling() {
  checkLiveStatus();
  setInterval(checkLiveStatus, 60000);
}

function scheduleTwitchStatusPolling() {
  const start = () => startTwitchStatusPolling();

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 1600 });
    return;
  }

  window.setTimeout(start, 900);
}

scheduleTwitchStatusPolling();

setInterval(rotateMascots, 7000);

// 配信履歴：同じ日に複数ゲームを入れられます。
// 例：{ date: "2026年5月25日", games: ["VALORANT", "雑談"] }

const dailyQuotes = [
  {
    text: "成功とは、失敗を重ねても情熱を失わないことだ。",
    author: "ウィンストン・チャーチル"
  },
  {
    text: "困難の中に、機会がある。",
    author: "アルベルト・アインシュタイン"
  },
  {
    text: "人生に失敗がないと、人生を失敗する。",
    author: "斎藤茂太"
  },
  {
    text: "夢を見ることができるなら、それは実現できる。",
    author: "ウォルト・ディズニー"
  },
  {
    text: "最も大切なのは、問い続けることをやめないことだ。",
    author: "アルベルト・アインシュタイン"
  },
  {
    text: "努力する人は希望を語り、怠ける人は不満を語る。",
    author: "井上靖"
  },
  {
    text: "明日死ぬかのように生きよ。永遠に生きるかのように学べ。",
    author: "マハトマ・ガンジー"
  },
  {
    text: "できると思えばできる。できないと思えばできない。",
    author: "ヘンリー・フォード"
  },
  {
    text: "勝つことばかり知りて、負くることを知らざれば、害その身に至る。",
    author: "徳川家康"
  },
  {
    text: "為せば成る、為さねば成らぬ何事も。",
    author: "上杉鷹山"
  },
  {
    text: "今日という日は、残りの人生の最初の日である。",
    author: "チャールズ・ディードリッヒ"
  },
  {
    text: "小さいことを積み重ねることが、とんでもないところへ行くただ一つの道だ。",
    author: "イチロー"
  },
  {
    text: "準備しておこう。チャンスはいつか訪れるものだ。",
    author: "エイブラハム・リンカーン"
  },
  {
    text: "人を信じよ、しかし、その百倍も自らを信じよ。",
    author: "手塚治虫"
  },
  {
    text: "過去から学び、今日のために生き、未来に希望を持て。",
    author: "アルベルト・アインシュタイン"
  }
];

function getTodayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function setDailyQuote() {
  const text = document.getElementById("dailyWordText");
  if (!text) return;

  const todayKey = getTodayKey();
  const storageKey = "yuzukosyoDailyQuote";
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    saved = null;
  }

  let quote = null;

  if (
    saved &&
    saved.date === todayKey &&
    Number.isInteger(saved.index) &&
    dailyQuotes[saved.index]
  ) {
    quote = dailyQuotes[saved.index];
  } else {
    const index = Math.floor(Math.random() * dailyQuotes.length);
    quote = dailyQuotes[index];

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        date: todayKey,
        index
      }));
    } catch (error) {
      // localStorageが使えない環境でも表示は続ける
    }
  }

  text.innerHTML = `
    <span class="quote-mark">“</span>${escapeHtml(quote.text)}<span class="quote-mark">”</span>
    <small>— ${escapeHtml(quote.author)}</small>
  `;
}

function normalizeMeigenValue(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getMeigenSignature(item) {
  return [
    normalizeMeigenValue(item?.text),
    normalizeMeigenValue(item?.speaker || "未設定"),
    normalizeMeigenValue(item?.place || "未設定"),
    normalizeMeigenValue(item?.date || "未設定")
  ].join("|");
}

function getVisibleMeigensForTop() {
  const publicItems = Array.isArray(window.YUZUKOSYO_PUBLIC_MEIGEN)
    ? window.YUZUKOSYO_PUBLIC_MEIGEN
    : [];
  let localItems = [];

  try {
    const raw = localStorage.getItem("yuzukosyoMeigenItems");
    const parsed = raw ? JSON.parse(raw) : [];
    localItems = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localItems = [];
  }

  const seen = new Set();

  return [...publicItems, ...localItems].filter((item) => {
    if (!item || item.visible === false || !String(item.text || "").trim()) return false;
    const signature = getMeigenSignature(item);
    if (!signature.trim() || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function getDailyMeigenForTop(items) {
  const todayKey = getTodayKey();
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

function setDailyMeigen() {
  const text = document.getElementById("dailyMeigenText");
  if (!text) return;

  const items = getVisibleMeigensForTop();

  if (!items.length) {
    text.innerHTML = `
      公開中の迷言はまだありません。
      <small>追加されたらここに出るよ</small>
    `;
    return;
  }

  const item = getDailyMeigenForTop(items);
  const speaker = item.speaker || "発言者未設定";
  const place = item.place ? ` / ${item.place}` : "";

  text.innerHTML = `
    <span class="quote-mark">“</span>${escapeHtml(item.text)}<span class="quote-mark">”</span>
    <small>— ${escapeHtml(speaker + place)}</small>
  `;
}


const omikujiItems = [
  {
    fortune: "大吉",
    comment: "今日は流れが味方しやすい日。思いついたことを小さく動かすと、次のきっかけにつながりやすいよ。",
    stream: "初見さんとの会話が広がりやすい",
    game: "集中力が続きやすい。強気でOK",
    chat: "ひとことコメントが流れを作る"
  },
  {
    fortune: "中吉",
    comment: "派手な勝負より、いつものペースが強い日。無理に盛らず、自然体でいくと安定します。",
    stream: "いつもの空気を大事にすると吉",
    game: "深追いせず、区切りを作ると良い",
    chat: "あいさつから会話が伸びる"
  },
  {
    fortune: "小吉",
    comment: "小さいラッキーを拾える日。大きな成果を狙うより、少し整えるだけで十分です。",
    stream: "短めの雑談が効く",
    game: "準備運あり。設定確認が吉",
    chat: "軽いツッコミが刺さりやすい"
  },
  {
    fortune: "吉",
    comment: "目立つ出来事は少なくても、じわっと良い日。焦らず進めば、ちゃんと前に進めます。",
    stream: "落ち着いた配信が合う",
    game: "堅実プレイが安定",
    chat: "返事を丁寧にすると吉"
  },
  {
    fortune: "末吉",
    comment: "最初は重くても、後半に流れが戻りやすい日。うまくいかない時はいったん休憩が正解。",
    stream: "後半に空気が温まりやすい",
    game: "序盤のミスを引きずらない",
    chat: "聞き役に回ると流れが良くなる"
  },
  {
    fortune: "ぽん吉",
    comment: "細かいことは一回置いておく日。勢いで笑える瞬間が来たら、それが今日の当たりです。",
    stream: "ぽんで解決する場面あり",
    game: "ノリの良さが武器になる",
    chat: "短いコメントほど強い"
  },
  {
    fortune: "たぬ吉",
    comment: "たぬちゃんが見守る日。無理に前へ出るより、かわいく様子見してから動くと吉。",
    stream: "癒やし枠が強い",
    game: "待ってから動くと成功しやすい",
    chat: "やさしい一言が残りやすい"
  },
  {
    fortune: "幽霊吉",
    comment: "静かに存在感が出る日。目立たない一言や小ネタが、あとから効いてきます。",
    stream: "急な一言がウケる可能性あり",
    game: "隠密・奇襲・様子見が吉",
    chat: "ROMからの一言に運あり"
  },
  {
    fortune: "沼吉",
    comment: "ハマりすぎ注意の日。ただし、沼った先においしい展開があるかもしれません。撤退ラインだけ決めておくと安全。",
    stream: "沼展開はネタにすると吉",
    game: "連敗時はいったん水分補給",
    chat: "共感コメントが集まりやすい"
  },
  {
    fortune: "配信吉",
    comment: "配信まわりに運がある日。タイトル、音量、画面、ひとこと案内を整えると見やすさが上がります。",
    stream: "開始前チェックが大吉行動",
    game: "見せ場を作りやすい",
    chat: "固定コメントや案内が効く"
  },
  {
    fortune: "超大吉",
    comment: "かなりレアな当たり。今日は勢いを借りて、やりたいことを一つだけ前に進める日です。",
    stream: "見せ場が自然に生まれやすい",
    game: "勝負勘あり。大事な場面ほど落ち着く",
    chat: "ひとことが流れを変える",
    rare: true,
    weight: 1
  },
  {
    fortune: "伝説のぽん吉",
    comment: "細かい理屈を置いて、なぜか全部ぽんで通る日。見つけた人はかなり運がいいです。",
    stream: "謎の一体感が出る",
    game: "ミスすらネタに変わる",
    chat: "短文コメントが最強",
    rare: true,
    weight: 1
  },
  {
    fortune: "たぬ神",
    comment: "たぬちゃんが本気で見守っている日。焦らず、でも逃げずに動くと良い流れを拾えます。",
    stream: "癒やしと笑いが両方出る",
    game: "待ちからの反撃が強い",
    chat: "やさしいコメントが刺さる",
    rare: true,
    weight: 1
  },
  {
    fortune: "幽霊覚醒",
    comment: "見えてないところで運が動く日。静かな一言、急なひらめき、変な偶然を拾うと吉。",
    stream: "急な神展開に注意",
    game: "隠密・読み合い・奇襲が強い",
    chat: "ROM勢の一言にレア運あり",
    rare: true,
    weight: 1
  }
];

function showOmikujiResult(item) {
  const ready = document.getElementById("omikujiReady");
  const result = document.getElementById("omikujiResult");
  const fortune = document.getElementById("omikujiFortune");
  const comment = document.getElementById("omikujiComment");
  const stream = document.getElementById("omikujiStream");
  const game = document.getElementById("omikujiGame");
  const chat = document.getElementById("omikujiChat");

  if (ready) ready.hidden = true;
  if (result) {
    result.hidden = false;
    result.classList.toggle("is-rare-result", Boolean(item.rare));
  }
  if (fortune) fortune.textContent = item.fortune;
  if (comment) comment.textContent = item.comment;
  if (stream) stream.textContent = item.stream;
  if (game) game.textContent = item.game;
  if (chat) chat.textContent = item.chat;
}

function pickWeightedOmikujiIndex() {
  const totalWeight = omikujiItems.reduce((sum, item) => sum + (Number(item.weight) > 0 ? Number(item.weight) : 10), 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < omikujiItems.length; i += 1) {
    const weight = Number(omikujiItems[i].weight) > 0 ? Number(omikujiItems[i].weight) : 10;
    random -= weight;
    if (random <= 0) return i;
  }

  return Math.max(0, omikujiItems.length - 1);
}

function setupDailyOmikuji() {
  const button = document.getElementById("omikujiButton");
  const box = document.getElementById("omikujiBox");
  if (!button || !box) return;

  const todayKey = getTodayKey();
  const storageKey = "yuzukosyoDailyOmikuji";
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch (error) {
    saved = null;
  }

  if (
    saved &&
    saved.date === todayKey &&
    Number.isInteger(saved.index) &&
    omikujiItems[saved.index]
  ) {
    showOmikujiResult(omikujiItems[saved.index]);
    button.textContent = "今日はもう引いたよ";
    button.classList.add("omikuji-button-done");
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }

  button.addEventListener("click", () => {
    let index;

    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (
        current &&
        current.date === todayKey &&
        Number.isInteger(current.index) &&
        omikujiItems[current.index]
      ) {
        index = current.index;
      }
    } catch (error) {
      index = undefined;
    }

    if (!Number.isInteger(index)) {
      index = pickWeightedOmikujiIndex();
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          date: todayKey,
          index
        }));
      } catch (error) {
        // localStorageが使えない環境でも表示は続ける
      }
    }

    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.textContent = "占い中…";

    box.classList.remove("omikuji-reveal", "omikuji-drawing");
    void box.offsetWidth;
    box.classList.add("omikuji-drawing");

    window.setTimeout(() => {
      box.classList.remove("omikuji-drawing", "omikuji-reveal");
      void box.offsetWidth;
      box.classList.add("omikuji-reveal");
      showOmikujiResult(omikujiItems[index]);
      button.textContent = "今日はもう引いたよ";
      button.classList.add("omikuji-button-done");
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }, 520);
  });
}



/* ===== v48: visit stamp card, unlock progress and hidden secrets ===== */
const VISIT_STAMP_STORAGE_KEY = "yuzukosyoVisitStampsV1";
const SECRET_ROOM_UNLOCK_DAYS = 15;

function parseDateKeyToLocalDate(dateKey) {
  const parts = String(dateKey).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateKeyFromDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addDays(date, offset) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + offset);
  return next;
}

function addMonths(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function loadVisitStampDates() {
  try {
    const raw = JSON.parse(localStorage.getItem(VISIT_STAMP_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(String(item))))).sort();
  } catch (error) {
    return [];
  }
}

function saveVisitStampDates(dates) {
  try {
    localStorage.setItem(VISIT_STAMP_STORAGE_KEY, JSON.stringify(Array.from(new Set(dates)).sort()));
  } catch (error) {
    // localStorageが使えない環境では表示だけ続ける
  }
}

function getConsecutiveVisitStreak(stampedSet, todayKey) {
  const today = parseDateKeyToLocalDate(todayKey);
  if (!today) return 0;

  let streak = 0;
  let cursor = today;

  while (stampedSet.has(formatDateKeyFromDate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getSecretMilestoneInfo(streak) {
  const cycle = SECRET_ROOM_UNLOCK_DAYS;
  const milestoneCount = streak > 0 ? Math.floor(streak / cycle) : 0;
  const cycleProgress = streak % cycle;
  const isMilestoneDay = streak > 0 && cycleProgress === 0;
  const nextMilestone = isMilestoneDay ? streak + cycle : (milestoneCount + 1) * cycle;
  const remaining = isMilestoneDay ? 0 : Math.max(0, nextMilestone - streak);
  const progressCount = isMilestoneDay ? cycle : cycleProgress;
  const milestoneLabel = isMilestoneDay ? `${milestoneCount}回目` : `${milestoneCount + 1}回目`;
  return { cycle, milestoneCount, cycleProgress, isMilestoneDay, nextMilestone, remaining, progressCount, milestoneLabel };
}

function getTwoMonthRangeKeys(today) {
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonth = addMonths(currentMonth, -1);
  return { previousMonth, currentMonth };
}

function countVisitsInTwoMonths(dates, today) {
  const { previousMonth } = getTwoMonthRangeKeys(today);
  const startKey = formatDateKeyFromDate(previousMonth);
  const endKey = formatDateKeyFromDate(today);
  return dates.filter((dateKey) => dateKey >= startKey && dateKey <= endKey).length;
}

function buildStampMonth(monthDate, stampedSet, todayKey, freshlyStampedToday = false) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const title = `${month + 1}月の出席表`;
  const accessibleTitle = `${year}年${month + 1}月`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = parseDateKeyToLocalDate(todayKey);
  const todayTime = today ? today.getTime() : Date.now();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const blanks = Array.from({ length: firstDay }, () => '<div class="stamp-day is-empty" aria-hidden="true"></div>').join("");
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month, day);
    const dateKey = formatDateKeyFromDate(date);
    const classes = ["stamp-day"];
    if (stampedSet.has(dateKey)) classes.push("is-stamped");
    if (dateKey === todayKey) classes.push("is-today");
    if (freshlyStampedToday && dateKey === todayKey && stampedSet.has(dateKey)) classes.push("is-new-stamp");
    if (date.getTime() > todayTime) classes.push("is-future");
    const label = stampedSet.has(dateKey) ? `${accessibleTitle}${day}日 来場済み` : `${accessibleTitle}${day}日`;
    return `<div class="${classes.join(" ")}" aria-label="${escapeHtml(label)}"><span>${day}</span></div>`;
  }).join("");

  return `
    <section class="stamp-month-card" aria-label="${escapeHtml(accessibleTitle)}の来場スタンプ">
      <h3 class="stamp-month-title">${escapeHtml(title)}</h3>
      <div class="stamp-weekdays" aria-hidden="true">${weekdays.map((day) => `<div class="stamp-weekday">${day}</div>`).join("")}</div>
      <div class="stamp-grid">${blanks}${days}</div>
    </section>
  `;
}

function triggerVisitStampAnimation(root, streak) {
  if (!root) return;
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("is-stamp-pressed");

  if (!prefersReducedMotion) {
    const effect = document.createElement("div");
    effect.className = "stamp-press-effect";
    effect.setAttribute("aria-hidden", "true");
    effect.innerHTML = `<span>済</span><small>来場スタンプ押しました</small>`;
    root.appendChild(effect);
    window.setTimeout(() => effect.remove(), 1900);
  }

  window.setTimeout(() => root.classList.remove("is-stamp-pressed"), 1900);
}

function showArrivalStampOverlay(streak, monthDate, stampedSet, todayKey) {
  const overlay = document.getElementById("arrivalStampOverlay");
  const streakEl = document.getElementById("arrivalStampStreak");
  const previewEl = document.getElementById("arrivalStampPreview");
  if (!overlay) return;

  if (streakEl) streakEl.textContent = String(streak);
  overlay.querySelectorAll("img[data-src]").forEach((img) => {
    if (!img.getAttribute("src")) {
      img.setAttribute("src", img.dataset.src);
    }
  });

  if (previewEl && monthDate && stampedSet && todayKey) {
    previewEl.dataset.previewTitle = `${monthDate.getMonth() + 1}月の出席表`;
    previewEl.innerHTML = buildStampMonth(monthDate, stampedSet, todayKey, true);
  }

  overlay.hidden = false;
  overlay.classList.remove("is-hiding");
  overlay.classList.add("is-showing");

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hideDelay = prefersReducedMotion ? 5000 : 5000;
  const removeDelay = prefersReducedMotion ? 5300 : 5650;

  window.setTimeout(() => {
    overlay.classList.add("is-hiding");
  }, hideDelay);

  window.setTimeout(() => {
    overlay.classList.remove("is-showing", "is-hiding");
    overlay.hidden = true;
    if (previewEl) { previewEl.innerHTML = ""; delete previewEl.dataset.previewTitle; }
  }, removeDelay);
}

function setupVisitStampCard() {
  const root = document.getElementById("visitStamp");
  const todayStatus = document.getElementById("stampTodayStatus");
  const streakCount = document.getElementById("stampStreakCount");
  const twoMonthCount = document.getElementById("stampTwoMonthCount");
  const months = document.getElementById("stampMonths");
  const unlockCard = document.getElementById("secretUnlockCard");
  const unlockTitle = document.getElementById("secretUnlockTitle");
  const unlockText = document.getElementById("secretUnlockText");
  const secretRoomLink = document.getElementById("secretRoomLink");
  const unlockProgressBar = document.getElementById("secretUnlockProgressBar");
  const unlockProgressText = document.getElementById("secretUnlockProgressText");

  if (!root || !months) return;

  const today = new Date();
  const todayKey = getTodayKey();
  const dates = loadVisitStampDates();
  const hadTodayStamp = dates.includes(todayKey);

  if (!hadTodayStamp) {
    dates.push(todayKey);
    saveVisitStampDates(dates);
  }

  const stampedSet = new Set(dates);
  const streak = getConsecutiveVisitStreak(stampedSet, todayKey);
  const twoMonthVisits = countVisitsInTwoMonths(dates, today);
  const { previousMonth, currentMonth } = getTwoMonthRangeKeys(today);

  if (todayStatus) {
    todayStatus.textContent = hadTodayStamp ? "今日の来場スタンプ：済" : "今日の来場スタンプ：済（今日分を押しました）";
    todayStatus.classList.toggle("is-new-stamp-status", !hadTodayStamp);
  }
  if (streakCount) {
    streakCount.textContent = String(streak);
    streakCount.classList.toggle("is-long-streak", String(streak).length >= 4);
    streakCount.setAttribute("aria-label", `連続来場${streak}日`);
  }
  if (twoMonthCount) twoMonthCount.textContent = String(twoMonthVisits);

  months.innerHTML = [
    buildStampMonth(previousMonth, stampedSet, todayKey, !hadTodayStamp),
    buildStampMonth(currentMonth, stampedSet, todayKey, !hadTodayStamp)
  ].join("");

  if (!hadTodayStamp) {
    showArrivalStampOverlay(streak, currentMonth, stampedSet, todayKey);
    triggerVisitStampAnimation(root, streak);
  }

  if (unlockTitle && unlockText && secretRoomLink) {
    const milestone = getSecretMilestoneInfo(streak);
    const progressPercent = Math.round((milestone.progressCount / milestone.cycle) * 100);
    if (unlockProgressBar) unlockProgressBar.style.width = `${progressPercent}%`;

    if (milestone.isMilestoneDay) {
      unlockCard?.classList.add("is-unlocked");
      unlockTitle.textContent = `隠しページ解放中（${milestone.milestoneLabel}）`;
      unlockText.textContent = `連続${streak}日来場達成。今日は15日ごとの節目なので、秘密基地のごほうび部屋に入れます。`;
      if (unlockProgressText) unlockProgressText.textContent = `${milestone.progressCount}/${milestone.cycle}日達成。次の解放日は連続${milestone.nextMilestone}日目です。`;
      secretRoomLink.hidden = false;
    } else {
      unlockCard?.classList.remove("is-unlocked");
      unlockTitle.textContent = `次の隠しページまであと${milestone.remaining}回`;
      unlockText.textContent = `現在、連続${streak}日来場中。次は連続${milestone.nextMilestone}日目で、${milestone.milestoneLabel}のごほうび部屋が開きます。`;
      if (unlockProgressText) unlockProgressText.textContent = `${milestone.progressCount}/${milestone.cycle}日。あと${milestone.remaining}回、毎日1回来場すると解放されます。`;
      secretRoomLink.hidden = true;
    }
  }
}

let secretToastTimer = null;

function showSecretToast(title, text, rare = false) {
  const toast = document.getElementById("secretToast");
  const toastTitle = document.getElementById("secretToastTitle");
  const toastText = document.getElementById("secretToastText");
  if (!toast || !toastTitle || !toastText) return;

  toastTitle.textContent = title;
  toastText.textContent = text;
  toast.classList.toggle("is-rare", rare);
  toast.hidden = false;

  clearTimeout(secretToastTimer);
  secretToastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toast.classList.remove("is-rare");
  }, rare ? 5200 : 3600);
}

function setupSecretInteractions() {
  const tanuLines = [
    "今日も来てくれてありがとうぽん。スタンプ押しておいたよ。",
    "無理せず、のんびり秘密基地で休んでってね。",
    "迷言が増えると、基地も少しにぎやかになるぽん。",
    "水分補給してからゲームすると吉。"
  ];
  const ghostLines = [
    "見つけたね。ここは少しだけ秘密の場所です。",
    "コメント一言でも、けっこう残るものだよ。",
    "静かに見てるだけでも、ちゃんと来場者です。",
    "今日の小ネタはここまで。たぶん。"
  ];

  if (tanuMascot) {
    tanuMascot.setAttribute("tabindex", "0");
    tanuMascot.setAttribute("role", "button");
    tanuMascot.setAttribute("aria-label", "たぬちゃんのひとことを見る");
    const speak = () => {
      const line = tanuLines[Math.floor(Math.random() * tanuLines.length)];
      if (tanuBubble) tanuBubble.textContent = line;
      tanuMascot.src = "assets/tanuchan-happy.webp";
      showSecretToast("たぬちゃんのひとこと", line);
    };
    tanuMascot.addEventListener("click", speak);
    tanuMascot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        speak();
      }
    });
  }

  if (ghostMascot) {
    ghostMascot.setAttribute("tabindex", "0");
    ghostMascot.setAttribute("role", "button");
    ghostMascot.setAttribute("aria-label", "幽霊ちゃんの小ネタを見る");
    const speak = () => {
      const rare = Math.random() < 0.08;
      if (rare) {
        const line = "レア演出発生。幽霊ちゃんが今日は少し本気です。";
        if (ghostBubble) ghostBubble.textContent = line;
        ghostMascot.src = "assets/ghost-wink.webp";
        document.body.classList.remove("ghost-rare-mode");
        void document.body.offsetWidth;
        document.body.classList.add("ghost-rare-mode");
        window.setTimeout(() => document.body.classList.remove("ghost-rare-mode"), 1500);
        showSecretToast("幽霊ちゃんレア演出", line, true);
        return;
      }

      const line = ghostLines[Math.floor(Math.random() * ghostLines.length)];
      if (ghostBubble) ghostBubble.textContent = line;
      showSecretToast("幽霊ちゃんの小ネタ", line);
    };
    ghostMascot.addEventListener("click", speak);
    ghostMascot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        speak();
      }
    });
  }

  const footerSecret = document.getElementById("footerSecretTrigger");
  if (footerSecret) {
    footerSecret.addEventListener("click", () => {
      const dates = loadVisitStampDates();
      const streak = getConsecutiveVisitStreak(new Set(dates), getTodayKey());
      const milestone = getSecretMilestoneInfo(streak);
      if (milestone.isMilestoneDay) {
        showSecretToast("ページ下部の隠しメッセージ", `今日は連続${streak}日達成のごほうび日です。スタンプカードから奥の部屋へどうぞ。`, true);
      } else {
        showSecretToast("ページ下部の隠しメッセージ", `見つけてくれてありがとう。次の隠しページまではあと${milestone.remaining}回です。`);
      }
    });
  }
}

setDailyQuote();
setDailyMeigen();
setupDailyOmikuji();
setupVisitStampCard();
setupSecretInteractions();


/* ===== v25: animation upgrade pack ===== */
function setupCursorParticles() {
  const cursorLight = document.getElementById("cursorLight");
  const particleLayer = document.getElementById("particleLayer");
  const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canHover || prefersReducedMotion) {
    if (cursorLight) cursorLight.style.display = "none";
    return;
  }

  document.body.classList.add("has-pointer");

  let lastParticleAt = 0;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  const moveLight = () => {
    if (cursorLight) {
      cursorLight.style.transform = `translate(${mouseX - 110}px, ${mouseY - 110}px)`;
    }
    requestAnimationFrame(moveLight);
  };
  requestAnimationFrame(moveLight);

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;

    const now = Date.now();
    if (!particleLayer || now - lastParticleAt < 54) return;
    lastParticleAt = now;

    const particle = document.createElement("span");
    particle.className = "cursor-particle";
    particle.style.left = `${event.clientX}px`;
    particle.style.top = `${event.clientY}px`;
    particle.style.setProperty("--px", `${Math.round((Math.random() - 0.5) * 48)}px`);
    particle.style.setProperty("--py", `${Math.round((Math.random() - 0.8) * 54)}px`);

    particleLayer.appendChild(particle);
    window.setTimeout(() => particle.remove(), 900);
  }, { passive: true });
}

function setupAmbientParticles() {
  const particleLayer = document.getElementById("particleLayer");
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!particleLayer || prefersReducedMotion) return;

  const count = window.innerWidth < 520 ? 18 : 34;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "ambient-particle";
    particle.style.setProperty("--x", `${Math.round(Math.random() * 100)}vw`);
    particle.style.setProperty("--y", `${Math.round(Math.random() * 100)}vh`);
    particle.style.setProperty("--s", `${Math.round(2 + Math.random() * 4)}px`);
    particle.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 90)}px`);
    particle.style.setProperty("--dy", `${Math.round(28 + Math.random() * 84)}px`);
    particle.style.setProperty("--d", `${Math.round(8 + Math.random() * 11)}s`);
    particle.style.setProperty("--delay", `${Math.round(Math.random() * -14)}s`);
    fragment.appendChild(particle);
  }

  particleLayer.appendChild(fragment);
}

function setupScrollReveal() {
  const targets = [
    ".hero",
    ".base-counter-card",
    ".stamp-card",
    ".mascot-area",
    ".cards > article",
    ".gear-card",
    ".gear-product-card",
    ".profile-card",
    ".mascot-profile-card",
    ".update-history-card"
  ];

  const elements = Array.from(document.querySelectorAll(targets.join(",")));
  if (!elements.length) return;

  elements.forEach((el, index) => {
    el.classList.add("reveal-on-scroll", `reveal-delay-${(index % 3) + 1}`);
  });

  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px"
  });

  elements.forEach((el) => observer.observe(el));
}

function setupAnimationPack() {
  setupAmbientParticles();
  setupScrollReveal();
}

setupAnimationPack();

setupCursorParticles();










function setupUpdateHistoryMore() {
  const card = document.querySelector(".update-history-card");
  const button = document.getElementById("updateMoreBtn");
  const viewport = document.getElementById("updateHistoryViewport");
  if (!card || !button || !viewport) return;

  const items = viewport.querySelectorAll(".update-history-list li");
  if (items.length <= 3) {
    button.style.display = "none";
    card.classList.add("is-expanded");
    return;
  }

  card.classList.remove("is-expanded");
  button.textContent = "もっと見る";

  button.addEventListener("click", () => {
    const expanded = card.classList.toggle("is-expanded");
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.textContent = expanded ? "閉じる" : "もっと見る";

    if (!expanded) {
      viewport.scrollTo({ top: 0, behavior: "smooth" });
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

setupUpdateHistoryMore();
