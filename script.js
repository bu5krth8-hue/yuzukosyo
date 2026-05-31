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


const SITE_SHARE_URL = "https://yuzukosyo.pages.dev/";

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const rawText = String(text || "");
  const paragraphs = rawText.split(/\n+/);
  let lines = [];
  paragraphs.forEach((paragraph) => {
    let line = "";
    Array.from(paragraph).forEach((char) => {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
  });
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/…$/,"")}…`;
  }
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function downloadBlobFile(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function openXShareText(text) {
  const shareText = `${text}\n\n#柚胡椒の秘密基地\n${SITE_SHARE_URL}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function shareOrDownloadImage(blob, filename, text, title) {
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/png" });
  const shareData = {
    title: title || "柚胡椒の秘密基地",
    text: `${text}\n\n#柚胡椒の秘密基地\n${SITE_SHARE_URL}`,
    files: [file]
  };

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    // 共有がキャンセル・失敗した場合は下の保存方式に切り替える
  }

  downloadBlobFile(blob, filename);
  openXShareText(`${text}\n\n画像を保存したので、投稿画面で添付してね。`);
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


function createOmikujiShareCanvas(item) {
  const scale = 2;
  const width = 980;
  const height = 1180;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#160726");
  bg.addColorStop(0.52, "#0b0314");
  bg.addColorStop(1, "#21071f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(168,85,247,.26)";
  ctx.beginPath();
  ctx.arc(120, 120, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(112,214,255,.16)";
  ctx.beginPath();
  ctx.arc(840, 180, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(250,204,21,.10)";
  ctx.beginPath();
  ctx.arc(490, 1040, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(216,180,254,.62)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 46, 46, width - 92, height - 92, 38);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(168,85,247,.85)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#f7ecff";
  ctx.font = "900 34px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText("🔮 今日の柚胡椒みくじ", width / 2, 118);
  ctx.shadowBlur = 0;

  ctx.font = "800 20px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "rgba(237,225,255,.76)";
  ctx.fillText(formatDateJa(new Date()), width / 2, 156);

  ctx.fillStyle = item && item.rare ? "rgba(250,204,21,.18)" : "rgba(112,214,255,.13)";
  ctx.strokeStyle = item && item.rare ? "rgba(250,204,21,.62)" : "rgba(112,214,255,.52)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 105, 210, width - 210, 190, 28);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = item && item.rare ? "rgba(250,204,21,.82)" : "rgba(112,214,255,.78)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 58px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText(item.fortune || "-", width / 2, 322);
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  ctx.fillStyle = "#f7ecff";
  ctx.font = "900 28px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  let y = 470;
  ctx.fillText("ひとこと", 120, y);
  ctx.font = "800 25px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "rgba(245,234,255,.94)";
  y = wrapCanvasText(ctx, item.comment || "-", 120, y + 48, width - 240, 38, 5) + 34;

  const rows = [
    ["配信運", item.stream || "-"],
    ["ゲーム運", item.game || "-"],
    ["コメント運", item.chat || "-"]
  ];
  rows.forEach(([label, value]) => {
    ctx.fillStyle = "rgba(10,4,20,.70)";
    ctx.strokeStyle = "rgba(216,180,254,.34)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 120, y, width - 240, 82, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d8f3ff";
    ctx.font = "900 22px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
    ctx.fillText(label, 150, y + 51);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 25px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
    wrapCanvasText(ctx, value, 310, y + 51, width - 460, 30, 1);
    y += 102;
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(237,225,255,.78)";
  ctx.font = "800 22px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText("柚胡椒の秘密基地", width / 2, height - 122);
  ctx.fillStyle = "#d8b4fe";
  ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText(SITE_SHARE_URL, width / 2, height - 84);

  return canvas;
}

function getTodayOmikujiItem() {
  const todayKey = getTodayKey();
  try {
    const saved = JSON.parse(localStorage.getItem("yuzukosyoDailyOmikuji") || "null");
    if (saved && saved.date === todayKey && Number.isInteger(saved.index) && omikujiItems[saved.index]) {
      return omikujiItems[saved.index];
    }
  } catch (error) {
    return null;
  }
  return null;
}

function updateOmikujiShareButtonState() {
  const shareButton = document.getElementById("omikujiShareButton");
  if (!shareButton) return;
  const item = getTodayOmikujiItem();
  const disabled = !item;
  shareButton.disabled = disabled;
  shareButton.setAttribute("aria-disabled", disabled ? "true" : "false");
  shareButton.textContent = disabled ? "みくじ後にSNS投稿できます" : "みくじ画像をSNSに投稿 →";
}

function setupOmikujiShareButton() {
  const shareButton = document.getElementById("omikujiShareButton");
  if (!shareButton) return;
  updateOmikujiShareButtonState();
  shareButton.addEventListener("click", async () => {
    const item = getTodayOmikujiItem();
    if (!item) {
      updateOmikujiShareButtonState();
      return;
    }
    const canvas = createOmikujiShareCanvas(item);
    const blob = canvas ? await canvasToPngBlob(canvas) : null;
    await shareOrDownloadImage(
      blob,
      `yuzukosyo-omikuji-${getTodayKey()}.png`,
      `今日の柚胡椒みくじを引いたよ！\n運勢：${item.fortune}\n配信運：${item.stream}\nゲーム運：${item.game}\nコメント運：${item.chat}`,
      "今日の柚胡椒みくじ"
    );
  });
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
    updateOmikujiShareButtonState();
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
      updateOmikujiShareButtonState();
    }, 520);
  });
}



/* ===== v48: visit stamp card, unlock progress and hidden secrets ===== */
const VISIT_STAMP_STORAGE_KEY = "yuzukosyoVisitStampsV1";
const VISIT_STAMP_HISTORY_MONTHS = 24;
const SECRET_ROOM_UNLOCK_DAYS = 20;
const SECRET_REWARD_TIERS = [20, 40, 60, 80, 100];

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

function getVisitStampRetentionStartDate(today = new Date()) {
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return addMonths(currentMonth, -(VISIT_STAMP_HISTORY_MONTHS - 1));
}

function getVisitStampRetentionRange(today = new Date()) {
  const startDate = getVisitStampRetentionStartDate(today);
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const nextExpiryDate = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1);
  return { startDate, endDate, nextExpiryDate };
}

function pruneVisitStampDatesToRetention(dates, today = new Date()) {
  const { startDate, endDate } = getVisitStampRetentionRange(today);
  const startKey = formatDateKeyFromDate(startDate);
  const endKey = formatDateKeyFromDate(endDate);
  return Array.from(new Set(dates.filter((dateKey) => dateKey >= startKey && dateKey <= endKey))).sort();
}

function formatYearMonthJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDateJa(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function loadVisitStampDates() {
  try {
    const raw = JSON.parse(localStorage.getItem(VISIT_STAMP_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const validDates = Array.from(new Set(raw.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(String(item))))).sort();
    return pruneVisitStampDatesToRetention(validDates);
  } catch (error) {
    return [];
  }
}

function saveVisitStampDates(dates) {
  try {
    localStorage.setItem(VISIT_STAMP_STORAGE_KEY, JSON.stringify(pruneVisitStampDatesToRetention(dates)));
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
  const unlockedTiers = SECRET_REWARD_TIERS.filter((days) => streak >= days);
  const nextTier = SECRET_REWARD_TIERS.find((days) => streak < days) || null;
  const previousTier = unlockedTiers.length ? unlockedTiers[unlockedTiers.length - 1] : 0;
  const isUnlocked = streak >= SECRET_ROOM_UNLOCK_DAYS;
  const isAllUnlocked = !nextTier;
  const nextMilestone = nextTier || SECRET_REWARD_TIERS[SECRET_REWARD_TIERS.length - 1];
  const remaining = nextTier ? Math.max(0, nextTier - streak) : 0;
  const progressCount = nextTier ? Math.max(0, streak - previousTier) : cycle;
  const cycleProgress = streak % cycle;
  const isMilestoneDay = streak > 0 && cycleProgress === 0;
  const milestoneCount = unlockedTiers.length;
  const milestoneLabel = isUnlocked ? `${milestoneCount}個目` : "1個目";
  return { cycle, milestoneCount, cycleProgress, isMilestoneDay, isUnlocked, isAllUnlocked, nextMilestone, remaining, progressCount, milestoneLabel };
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

function countVisitsInRetentionMonths(dates, today) {
  const startKey = formatDateKeyFromDate(getVisitStampRetentionStartDate(today));
  const endKey = formatDateKeyFromDate(today);
  return dates.filter((dateKey) => dateKey >= startKey && dateKey <= endKey).length;
}

function getStampHistoryMonths(today = new Date()) {
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return Array.from({ length: VISIT_STAMP_HISTORY_MONTHS }, (_, index) => addMonths(currentMonth, -index));
}

function buildStampMonth(monthDate,stampedSet,todayKey,freshlyStampedToday=false,options={}){
const year=monthDate.getFullYear();
const month=monthDate.getMonth();
const title=options.showYear ? `${year}年${month+1}月の出席表` : `${month+1}月の出席表`;
const accessibleTitle=`${year}年${month+1}月`;
const firstDay=new Date(year,month,1).getDay();
const daysInMonth=new Date(year,month+1,0).getDate();
const today=parseDateKeyToLocalDate(todayKey);
const todayTime=today ? today.getTime():Date.now();
const weekdays=["日","月","火","水","木","金","土"];
const blanks=Array.from({length:firstDay},()=>'<div class="stamp-day is-empty" aria-hidden="true"></div>').join("");
const days=Array.from({length:daysInMonth},(_,index)=>{
const day=index+1;
const date=new Date(year,month,day);
const dateKey=formatDateKeyFromDate(date);
const classes=["stamp-day"];
if(stampedSet.has(dateKey))classes.push("is-stamped");
if(dateKey===todayKey)classes.push("is-today");
if(freshlyStampedToday && dateKey===todayKey && stampedSet.has(dateKey))classes.push("is-new-stamp");
if(date.getTime()>todayTime)classes.push("is-future");
const label=stampedSet.has(dateKey)? `${accessibleTitle}${day}日 来場済み`:`${accessibleTitle}${day}日`;
return `<div class="${classes.join(" ")}" aria-label="${escapeHtml(label)}"><span>${day}</span></div>`;
}).join("");
const monthBody=`
<div class="stamp-weekdays" aria-hidden="true">${weekdays.map((day)=>`<div class="stamp-weekday">${day}</div>`).join("")}</div>
<div class="stamp-grid">${blanks}${days}</div>
`;
if(options.collapsible){
const count=Array.from({length:daysInMonth},(_,index)=>{
const dateKey=formatDateKeyFromDate(new Date(year,month,index+1));
return stampedSet.has(dateKey)?1:0;
}).reduce((total,value)=>total+value,0);
return `
<details class="stamp-month-card stamp-month-accordion" aria-label="${escapeHtml(accessibleTitle)}の来場スタンプ">
<summary class="stamp-month-summary">
<span class="stamp-month-summary-main"><span class="stamp-month-summary-icon" aria-hidden="true">📅</span><span>${escapeHtml(title)}</span></span>
<span class="stamp-month-summary-sub">${count}日 来場</span>
</summary>
<div class="stamp-month-accordion-body">
${monthBody}
</div>
</details>
`;
}
return `
<section class="stamp-month-card" aria-label="${escapeHtml(accessibleTitle)}の来場スタンプ">
<h3 class="stamp-month-title">${escapeHtml(title)}</h3>
${monthBody}
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

let arrivalStampHideTimer = null;
let arrivalStampRemoveTimer = null;

function closeArrivalStampOverlay() {
  const overlay = document.getElementById("arrivalStampOverlay");
  const previewEl = document.getElementById("arrivalStampPreview");
  if (!overlay || overlay.hidden) return;

  clearTimeout(arrivalStampHideTimer);
  clearTimeout(arrivalStampRemoveTimer);

  overlay.classList.add("is-hiding");
  arrivalStampRemoveTimer = window.setTimeout(() => {
    overlay.classList.remove("is-showing", "is-hiding");
    overlay.hidden = true;
    if (previewEl) {
      previewEl.innerHTML = "";
      delete previewEl.dataset.previewTitle;
    }
  }, 520);
}

function showArrivalStampOverlay(streak, monthDate, stampedSet, todayKey, options = {}) {
  const overlay = document.getElementById("arrivalStampOverlay");
  const streakEl = document.getElementById("arrivalStampStreak");
  const previewEl = document.getElementById("arrivalStampPreview");
  const closeButton = document.getElementById("arrivalStampClose");
  if (!overlay) return;

  const { autoHide = true, hideDelay = 7000 } = options;
  clearTimeout(arrivalStampHideTimer);
  clearTimeout(arrivalStampRemoveTimer);

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

  if (closeButton) {
    closeButton.onclick = closeArrivalStampOverlay;
  }

  overlay.hidden = false;
  overlay.classList.remove("is-hiding");
  overlay.classList.add("is-showing");

  if (!autoHide) return;

  arrivalStampHideTimer = window.setTimeout(() => {
    overlay.classList.add("is-hiding");
  }, hideDelay);

  arrivalStampRemoveTimer = window.setTimeout(() => {
    overlay.classList.remove("is-showing", "is-hiding");
    overlay.hidden = true;
    if (previewEl) {
      previewEl.innerHTML = "";
      delete previewEl.dataset.previewTitle;
    }
  }, hideDelay + 650);
}

function setupVisitStampCard() {
  const root = document.getElementById("visitStamp");
  const todayStatus = document.getElementById("stampTodayStatus");
  const streakCount = document.getElementById("stampStreakCount");
  const twoMonthCount = document.getElementById("stampTwoMonthCount");
  const months = document.getElementById("stampMonths");
  const replayButton = document.getElementById("stampReplayButton");
  const stampShareButton = document.getElementById("stampShareButton");
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
  const retentionVisits = countVisitsInRetentionMonths(dates, today);
  const { currentMonth } = getTwoMonthRangeKeys(today);

  if (todayStatus) {
    todayStatus.textContent = hadTodayStamp ? "今日の来場スタンプ：済" : "今日の来場スタンプ：済（今日分を押しました）";
    todayStatus.classList.toggle("is-new-stamp-status", !hadTodayStamp);
  }
  if (streakCount) {
    streakCount.textContent = String(streak);
    streakCount.classList.toggle("is-long-streak", String(streak).length >= 4);
    streakCount.setAttribute("aria-label", `連続来場${streak}日`);
  }
  if (twoMonthCount) twoMonthCount.textContent = String(retentionVisits);

  months.innerHTML = buildStampMonth(currentMonth, stampedSet, todayKey, !hadTodayStamp);

  if (replayButton) {
    replayButton.onclick = () => {
      showArrivalStampOverlay(streak, currentMonth, stampedSet, todayKey, { autoHide: false });
      triggerVisitStampAnimation(root, streak);
    };
  }

  if (stampShareButton) {
    stampShareButton.onclick = () => shareStampMonthImage(currentMonth, stampedSet, todayKey);
  }

  if (!hadTodayStamp) {
    showArrivalStampOverlay(streak, currentMonth, stampedSet, todayKey, { autoHide: true, hideDelay: 7000 });
    triggerVisitStampAnimation(root, streak);
  }

  if (unlockTitle && unlockText && secretRoomLink) {
    const milestone = getSecretMilestoneInfo(streak);
    const progressPercent = Math.round((milestone.progressCount / milestone.cycle) * 100);
    if (unlockProgressBar) unlockProgressBar.style.width = `${progressPercent}%`;

    if (milestone.isUnlocked) {
      unlockCard?.classList.add("is-unlocked");
      secretRoomLink.hidden = false;
      if (milestone.isAllUnlocked) {
        unlockTitle.textContent = "連続来場特典をすべて解放済み";
        unlockText.textContent = `連続${streak}日来場中。100日連続までの壁紙特典はすべて見られます。`;
        if (unlockProgressText) unlockProgressText.textContent = "100日連続までの壁紙をすべて解放しました。";
      } else {
        unlockTitle.textContent = `隠しページ解放中（${milestone.milestoneCount}個解放済み）`;
        unlockText.textContent = `連続${streak}日来場中。解放済みの壁紙を隠しページで見られます。次は連続${milestone.nextMilestone}日で新しい壁紙が解放されます。`;
        if (unlockProgressText) unlockProgressText.textContent = `${milestone.progressCount}/${milestone.cycle}日。次の壁紙まであと${milestone.remaining}日です。`;
      }
    } else {
      unlockCard?.classList.remove("is-unlocked");
      unlockTitle.textContent = `隠しページまであと${milestone.remaining}回`;
      unlockText.textContent = `現在、連続${streak}日来場中。連続20日達成で、最初の壁紙特典が開きます。`;
      if (unlockProgressText) unlockProgressText.textContent = `${milestone.progressCount}/${milestone.cycle}日。あと${milestone.remaining}回、毎日1回来場すると解放されます。`;
      secretRoomLink.hidden = true;
    }
  }
}


function countVisitsInMonth(monthDate, stampedSet) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (stampedSet.has(formatDateKeyFromDate(new Date(year, month, day)))) count += 1;
  }
  return count;
}

function buildStampHistoryMonth(monthDate, stampedSet, todayKey) {
  const year = monthDate.getFullYear();
  const monthNumber = monthDate.getMonth() + 1;
  const count = countVisitsInMonth(monthDate, stampedSet);
  const monthKey = `${year}-${String(monthNumber).padStart(2, "0")}`;
  return `
<article class="stamp-history-month-card" data-stamp-history-month="${monthKey}">
  <div class="stamp-history-month-actions">
    <div>
      <strong>${year}年${monthNumber}月</strong>
      <span>${count}日 来場</span>
    </div>
    <button class="mini-btn stamp-history-save-btn" type="button" data-save-stamp-month="${monthKey}">この月を画像保存 →</button>
  </div>
  ${buildStampMonth(monthDate, stampedSet, todayKey, false, { showYear: true })}
</article>
`;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}



function drawTanukiVisitStamp(ctx, cx, cy, size = 48) {
  const r = size / 2;
  ctx.save();

  ctx.shadowColor = "rgba(250,204,21,.46)";
  ctx.shadowBlur = 12;

  ctx.fillStyle = "rgba(250,204,21,.18)";
  ctx.strokeStyle = "rgba(250,204,21,.70)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#8b4a21";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.78, cy - r * 0.34);
  ctx.lineTo(cx - r * 1.05, cy - r * 0.98);
  ctx.lineTo(cx - r * 0.32, cy - r * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + r * 0.78, cy - r * 0.34);
  ctx.lineTo(cx + r * 1.05, cy - r * 0.98);
  ctx.lineTo(cx + r * 0.32, cy - r * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#b86b2d";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c48d";
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.18, r * 0.56, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3b1f13";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.32, cy - r * 0.08, r * 0.18, r * 0.22, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.32, cy - r * 0.08, r * 0.18, r * 0.22, 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.arc(cx - r * 0.36, cy - r * 0.12, r * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.28, cy - r * 0.12, r * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a130b";
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.12, r * 0.10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2a130b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx - r * 0.10, cy + r * 0.25, r * 0.12, 0.15, Math.PI - 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + r * 0.10, cy + r * 0.25, r * 0.12, 0.1, Math.PI - 0.15);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.58)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.98, -0.35, Math.PI * 1.35);
  ctx.stroke();

  ctx.restore();
}

function createStampMonthCanvas(monthDate, stampedSet, todayKey) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthNumber = month + 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayDate = parseDateKeyToLocalDate(todayKey);
  const todayTime = todayDate ? todayDate.getTime() : Date.now();

  const scale = 2;
  const width = 980;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#12051f");
  bg.addColorStop(0.55, "#170620");
  bg.addColorStop(1, "#030006");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(168, 85, 247, 0.28)";
  ctx.beginPath();
  ctx.arc(120, 90, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(112, 214, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(850, 160, 190, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(216,180,254,.55)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 44, 44, width - 88, height - 88, 34);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f7ecff";
  ctx.font = "900 42px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.shadowColor = "rgba(168,85,247,.85)";
  ctx.shadowBlur = 18;
  ctx.fillText(`📮 ${year}年${monthNumber}月の出席表`, width / 2, 112);
  ctx.shadowBlur = 0;

  const visitCount = countVisitsInMonth(monthDate, stampedSet);
  ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "rgba(237,225,255,.86)";
  ctx.fillText(`来場 ${visitCount} 日 / 保存期間：過去24ヶ月`, width / 2, 154);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const gridX = 100;
  const gridY = 210;
  const gap = 14;
  const cell = 100;

  ctx.font = "900 20px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  weekdays.forEach((day, index) => {
    ctx.fillStyle = index === 0 ? "#fecdd3" : index === 6 ? "#bae6fd" : "rgba(233,213,255,.80)";
    ctx.fillText(day, gridX + index * (cell + gap) + cell / 2, gridY);
  });

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKeyFromDate(date);
    const cellIndex = firstDay + day - 1;
    const col = cellIndex % 7;
    const row = Math.floor(cellIndex / 7);
    const x = gridX + col * (cell + gap);
    const y = gridY + 30 + row * (cell + gap);
    const isStamped = stampedSet.has(dateKey);
    const isToday = dateKey === todayKey;
    const isFuture = date.getTime() > todayTime;

    ctx.fillStyle = isStamped ? "rgba(34,211,238,.28)" : "rgba(7,3,14,.72)";
    ctx.strokeStyle = isToday ? "rgba(250,204,21,.95)" : (isStamped ? "rgba(125,211,252,.88)" : "rgba(216,180,254,.28)");
    ctx.lineWidth = isToday ? 4 : 2;
    drawRoundedRect(ctx, x, y, cell, cell, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFuture ? "rgba(237,225,255,.30)" : "#fff";
    ctx.font = "900 24px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
    ctx.fillText(String(day), x + cell / 2, y + 34);

    if (isStamped) {
      drawTanukiVisitStamp(ctx, x + cell / 2, y + 66, 46);
    }
  }

  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillStyle = "rgba(237,225,255,.70)";
  ctx.fillText("柚胡椒の秘密基地 / 来場スタンプカード", width / 2, height - 102);
  ctx.fillStyle = "#d8b4fe";
  ctx.font = "900 20px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText(SITE_SHARE_URL, width / 2, height - 72);

  return canvas;
}

function downloadStampMonthImage(monthDate, stampedSet, todayKey) {
  const canvas = createStampMonthCanvas(monthDate, stampedSet, todayKey);
  if (!canvas) return;
  canvas.toBlob((blob) => {
    const year = monthDate.getFullYear();
    const monthNumber = monthDate.getMonth() + 1;
    downloadBlobFile(blob, `yuzukosyo-stamp-${year}-${String(monthNumber).padStart(2, "0")}.png`);
  }, "image/png");
}

async function shareStampMonthImage(monthDate, stampedSet, todayKey) {
  const canvas = createStampMonthCanvas(monthDate, stampedSet, todayKey);
  const blob = canvas ? await canvasToPngBlob(canvas) : null;
  const monthLabel = `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`;
  const visitCount = countVisitsInMonth(monthDate, stampedSet);
  await shareOrDownloadImage(
    blob,
    `yuzukosyo-stamp-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}.png`,
    `${monthLabel}の来場スタンプカード！\n今月の来場：${visitCount}日`,
    "来場スタンプカード"
  );
}

function setupStampHistoryPage() {
  const root = document.getElementById("stampHistoryPage");
  const monthsRoot = document.getElementById("stampHistoryMonths");
  if (!root || !monthsRoot) return;

  const today = new Date();
  const todayKey = getTodayKey();
  const dates = loadVisitStampDates();
  if (!dates.includes(todayKey)) {
    dates.push(todayKey);
    saveVisitStampDates(dates);
  }

  const stampedSet = new Set(loadVisitStampDates());
  const range = getVisitStampRetentionRange(today);
  const months = getStampHistoryMonths(today);
  const total = countVisitsInRetentionMonths(Array.from(stampedSet), today);
  const streak = getConsecutiveVisitStreak(stampedSet, todayKey);

  const rangeText = document.getElementById("stampHistoryRangeText");
  const expiryText = document.getElementById("stampHistoryExpiryText");
  const totalEl = document.getElementById("stampHistoryTotal");
  const streakEl = document.getElementById("stampHistoryStreak");

  if (rangeText) {
    rangeText.textContent = `現在の保存対象：${formatYearMonthJa(range.startDate)}〜${formatYearMonthJa(today)}の24ヶ月分。`;
  }
  if (expiryText) {
    expiryText.textContent = `次に保存期間が切れるのは ${formatYearMonthJa(range.startDate)} 分です。${formatDateJa(range.nextExpiryDate)} 以降は表示・画像保存の対象外になります。`;
  }
  if (totalEl) totalEl.textContent = String(total);
  if (streakEl) streakEl.textContent = String(streak);

  monthsRoot.innerHTML = months.map((monthDate) => buildStampHistoryMonth(monthDate, stampedSet, todayKey)).join("");

  monthsRoot.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-save-stamp-month]") : null;
    if (!target) return;
    const monthKey = target.getAttribute("data-save-stamp-month");
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey || "");
    if (!match) return;
    const monthDate = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    downloadStampMonthImage(monthDate, stampedSet, todayKey);
  });
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
      if (milestone.isUnlocked) {
        const nextText = milestone.isAllUnlocked ? "100日連続までの壁紙はすべて解放済みです。" : `次の壁紙まではあと${milestone.remaining}回です。`;
        showSecretToast("ページ下部の隠しメッセージ", `隠しページ解放中です。${nextText}`, true);
      } else {
        showSecretToast("ページ下部の隠しメッセージ", `見つけてくれてありがとう。隠しページまではあと${milestone.remaining}回です。`);
      }
    });
  }
}

setDailyQuote();
setDailyMeigen();
setupDailyOmikuji();
setupOmikujiShareButton();
setupVisitStampCard();
setupStampHistoryPage();
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


function setupStableShortcutJumps() {
  const nav = document.querySelector(".topbar-actions");
  if (!nav) return;

  const anchorMap = new Set(["#top", "#visitStamp", "#schedule", "#omikuji", "#updates", "#stream-gear"]);
  const jumpPrepareTargets = [
    ".visit-stamp-section",
    ".mascot-area",
    ".beginner-section",
    ".schedule-wide-section",
    ".schedule-wide-card",
    ".extra-cards",
    ".page-links-section",
    ".update-history-section",
    ".gear-market-section"
  ].join(",");

  let shortcutLayoutPrepared = false;

  function prepareShortcutLayoutOnce() {
    if (shortcutLayoutPrepared) return;
    shortcutLayoutPrepared = true;

    // 初回だけズレる主因は、下部セクションの content-visibility と
    // 初期描画中の高さ計算がショートカット押下時にまだ確定していないこと。
    // 右上ショートカットを使う瞬間だけ先にレイアウトを確定させる。
    document.body.classList.add("anchor-jump-prep");

    document.querySelectorAll(jumpPrepareTargets).forEach((element) => {
      element.getBoundingClientRect();
    });

    // 強制的に再計算を走らせてからスクロール位置を取る。
    document.documentElement.getBoundingClientRect();
    document.body.offsetHeight;
  }

  function getShortcutOffset(hash) {
    if (hash === "#top") return 0;

    const actions = document.querySelector(".topbar-actions");
    const navHeight = actions ? Math.ceil(actions.getBoundingClientRect().height) : 0;
    const width = window.innerWidth || document.documentElement.clientWidth || 0;

    if (hash === "#stream-gear" || hash === "#updates" || hash === "#visitStamp") {
      if (width <= 520) return Math.max(168, navHeight + 12);
      if (width <= 900) return Math.max(188, navHeight + 16);
      return 210;
    }

    if (width <= 520) return Math.max(112, navHeight + 10);
    if (width <= 900) return Math.max(132, navHeight + 14);
    return 170;
  }

  function getTargetTop(hash) {
    if (hash === "#top") return 0;

    const target = document.querySelector(hash);
    if (!target) return null;

    const offset = getShortcutOffset(hash);
    return Math.max(0, Math.round(window.scrollY + target.getBoundingClientRect().top - offset));
  }

  function scrollToShortcutTarget(hash) {
    const top = getTargetTop(hash);
    if (top === null) return;

    // ショートカットは「確実に飛ぶ」ことを優先し、smooth補正は使わない。
    // smooth中に高さ再計算が入ると、初回だけズレる原因になる。
    window.scrollTo({
      top,
      behavior: "auto"
    });
  }

  function performStableJump(hash, shouldUpdateHash) {
    if (!anchorMap.has(hash)) return;

    prepareShortcutLayoutOnce();

    window.requestAnimationFrame(() => {
      scrollToShortcutTarget(hash);

      if (shouldUpdateHash && history.pushState) {
        history.pushState(null, "", hash);
      }
    });
  }

  nav.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
    const link = target ? target.closest('a[href^="#"]') : null;
    if (!link) return;

    const hash = link.hash;
    if (!anchorMap.has(hash)) return;

    event.preventDefault();
    performStableJump(hash, true);
  });

  if (window.location.hash && anchorMap.has(window.location.hash)) {
    window.addEventListener("load", () => {
      window.setTimeout(() => performStableJump(window.location.hash, false), 140);
    }, { once: true });
  }
}

setupStableShortcutJumps();
