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
    src: "assets/ghost.png",
    text: "Xでお知らせ出すから見てね！"
  },
  {
    src: "assets/ghost-wink.png",
    text: "コメントくれるとめっちゃ嬉しいよ〜！"
  }
];

const tanuFaces = [
  {
    src: "assets/tanuchan.png",
    text: "Discordでも待ってるよ〜！"
  },
  {
    src: "assets/tanuchan-wink.png",
    text: "応援ほんとにありがとうぽん！"
  },
  {
    src: "assets/tanuchan-happy.png",
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

checkLiveStatus();

setInterval(checkLiveStatus, 60000);

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

setDailyQuote();
setupCursorParticles();
