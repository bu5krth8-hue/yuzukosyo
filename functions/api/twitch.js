export async function onRequest(context) {
  const env = context.env || {};

  const CLIENT_ID = String(env.TWITCH_CLIENT_ID || "").trim();
  const CLIENT_SECRET = String(env.TWITCH_CLIENT_SECRET || "").trim();
  const CHANNEL_LOGIN = String(env.TWITCH_CHANNEL_LOGIN || "yuzukosyo07").trim();

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({
      configured: false,
      isLive: false,
      stream: null,
      scheduleConfigured: false,
      schedule: [],
      scheduleMessage: "Twitch APIキー未設定",
      debug: {
        hasClientId: Boolean(CLIENT_ID),
        hasClientSecret: Boolean(CLIENT_SECRET),
        channelLogin: CHANNEL_LOGIN
      }
    });
  }

  try {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials"
      })
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();

      return json({
        configured: true,
        isLive: false,
        stream: null,
        scheduleConfigured: false,
        schedule: [],
        scheduleMessage: "Twitchトークン取得エラー",
        error: `Twitch token error: ${tokenResponse.status} ${text}`,
        debug: {
          hasClientId: Boolean(CLIENT_ID),
          hasClientSecret: Boolean(CLIENT_SECRET),
          clientIdStart: CLIENT_ID.slice(0, 6),
          clientIdLength: CLIENT_ID.length,
          secretLength: CLIENT_SECRET.length,
          channelLogin: CHANNEL_LOGIN
        }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return json({
        configured: true,
        isLive: false,
        stream: null,
        scheduleConfigured: false,
        schedule: [],
        scheduleMessage: "アクセストークン取得失敗"
      });
    }

    const commonHeaders = {
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${accessToken}`
    };

    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(CHANNEL_LOGIN)}`,
      { headers: commonHeaders }
    );

    if (!userResponse.ok) {
      const text = await userResponse.text();
      return json({
        configured: true,
        isLive: false,
        stream: null,
        scheduleConfigured: false,
        schedule: [],
        scheduleMessage: "Twitchユーザー取得エラー",
        error: `Twitch user error: ${userResponse.status} ${text}`
      });
    }

    const userData = await userResponse.json();
    const user = userData.data && userData.data[0];

    if (!user) {
      return json({
        configured: true,
        channel: CHANNEL_LOGIN,
        isLive: false,
        stream: null,
        scheduleConfigured: false,
        schedule: [],
        scheduleMessage: "Twitchユーザーが見つかりません"
      });
    }

    const liveResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(CHANNEL_LOGIN)}`,
      { headers: commonHeaders }
    );

    if (!liveResponse.ok) {
      const text = await liveResponse.text();
      return json({
        configured: true,
        channel: CHANNEL_LOGIN,
        isLive: false,
        stream: null,
        scheduleConfigured: false,
        schedule: [],
        scheduleMessage: "ライブ情報取得エラー",
        error: `Twitch live error: ${liveResponse.status} ${text}`
      });
    }

    const liveData = await liveResponse.json();
    const live = liveData.data && liveData.data[0];

    let scheduleConfigured = true;
    let scheduleMessage = "Twitchの配信予定を取得しました";
    let schedule = [];

    try {
      const scheduleResponse = await fetch(
        `https://api.twitch.tv/helix/schedule?broadcaster_id=${encodeURIComponent(user.id)}&first=5`,
        { headers: commonHeaders }
      );

      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json();

        const segments =
          scheduleData.data &&
          Array.isArray(scheduleData.data.segments)
            ? scheduleData.data.segments
            : [];

        schedule = segments.map((segment) => ({
          startTime: segment.start_time || "",
          endTime: segment.end_time || "",
          title: segment.title || "配信予定",
          category:
            segment.category && segment.category.name
              ? segment.category.name
              : "カテゴリ未設定"
        }));
      } else {
        scheduleConfigured = false;
        scheduleMessage = "スケジュール取得失敗";
      }
    } catch (scheduleError) {
      scheduleConfigured = false;
      scheduleMessage = "スケジュール取得例外";
    }

    return json({
      configured: true,
      channel: CHANNEL_LOGIN,
      isLive: Boolean(live),
      stream: live
        ? {
            title: live.title || "配信中",
            gameName: live.game_name || "未設定",
            viewerCount: live.viewer_count || 0,
            startedAt: live.started_at || "",
            thumbnailUrl: live.thumbnail_url
              ? live.thumbnail_url
                  .replace("{width}", "640")
                  .replace("{height}", "360")
              : ""
          }
        : null,
      scheduleConfigured,
      scheduleMessage,
      schedule
    });
  } catch (error) {
    return json({
      configured: true,
      channel: CHANNEL_LOGIN,
      isLive: false,
      stream: null,
      scheduleConfigured: false,
      schedule: [],
      scheduleMessage: "Twitch API取得エラー",
      error: error.message
    });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
