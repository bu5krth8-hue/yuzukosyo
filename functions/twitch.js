const CHANNEL_LOGIN = process.env.TWITCH_CHANNEL_LOGIN || "yuzukosyo07";

exports.handler = async function () {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return json({
      configured: false,
      isLive: false,
      stream: null,
      scheduleConfigured: false,
      schedule: [],
      scheduleMessage: "Twitch APIキー未設定"
    });
  }

  try {
    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });

    if (!tokenRes.ok) throw new Error("Twitch token error");
    const tokenData = await tokenRes.json();
    const headers = {
      "Client-ID": clientId,
      "Authorization": `Bearer ${tokenData.access_token}`
    };

    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(CHANNEL_LOGIN)}`, { headers });
    if (!userRes.ok) throw new Error("Twitch user error");
    const userData = await userRes.json();
    const user = userData.data && userData.data[0];
    if (!user) throw new Error("Twitch channel not found");

    const [streamData, scheduleData] = await Promise.all([
      getStream(headers),
      getSchedule(headers, user.id)
    ]);

    const stream = streamData.data && streamData.data[0];
    const segments = scheduleData.data && Array.isArray(scheduleData.data.segments)
      ? scheduleData.data.segments
      : [];

    return json({
      configured: true,
      isLive: Boolean(stream),
      channel: CHANNEL_LOGIN,
      stream: stream ? {
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        startedAt: stream.started_at,
        thumbnailUrl: stream.thumbnail_url ? stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360") : "",
        url: `https://www.twitch.tv/${CHANNEL_LOGIN}`
      } : null,
      // 旧script互換用
      data: streamData.data || [],
      pagination: streamData.pagination || {},
      scheduleConfigured: true,
      schedule: segments.slice(0, 5).map((segment) => ({
        id: segment.id,
        title: segment.title || "配信予定",
        category: segment.category ? segment.category.name : "カテゴリ未設定",
        startTime: segment.start_time,
        endTime: segment.end_time,
        canceledUntil: segment.canceled_until || null,
        isRecurring: Boolean(segment.is_recurring)
      })),
      scheduleMessage: segments.length ? "Twitchスケジュール取得成功" : "登録済み予定なし"
    });
  } catch (error) {
    return json({
      configured: true,
      isLive: false,
      stream: null,
      data: [],
      pagination: {},
      scheduleConfigured: false,
      schedule: [],
      scheduleMessage: "Twitch配信予定を取得できませんでした",
      error: error.message
    }, 200);
  }
};

async function getStream(headers) {
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(CHANNEL_LOGIN)}`, { headers });
  if (!res.ok) throw new Error("Twitch stream error");
  return res.json();
}

async function getSchedule(headers, broadcasterId) {
  const now = new Date().toISOString();
  const res = await fetch(`https://api.twitch.tv/helix/schedule?broadcaster_id=${encodeURIComponent(broadcasterId)}&start_time=${encodeURIComponent(now)}&first=5`, { headers });

  // Twitch側でスケジュール未設定などの場合もサイトは落とさない
  if (!res.ok) {
    return { data: { segments: [] } };
  }

  return res.json();
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}
