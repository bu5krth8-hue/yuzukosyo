import {getSharedSchedule, readSchedule, twitchToken, twitchUser, websiteSchedule} from "../_twitch/schedule.js";

export async function onRequest(context) {
 const env = context.env || {};

 const CLIENT_ID = String(env.TWITCH_CLIENT_ID || "").trim();
 const CLIENT_SECRET = String(env.TWITCH_CLIENT_SECRET || "").trim();
 const CHANNEL_LOGIN = String(env.TWITCH_CHANNEL_LOGIN || "yuzukosyo07").trim().toLowerCase();

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
  const tokenResponse = await twitchToken(CLIENT_ID, CLIENT_SECRET);

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

  const shared = env.TWITCH_USE_SHARED_SCHEDULE === "1" ? await getSharedSchedule(env.RPG_SUPPORT, Date.now()) : null;
  let user;
  if (shared === null) {
   const userResponse = await twitchUser(commonHeaders, CHANNEL_LOGIN);

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
   user = userData.data && userData.data[0];

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
  }

  const liveResponse = await fetch(
   `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(CHANNEL_LOGIN)}`,
   {
    cache: "no-store",
    headers: commonHeaders
   }
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
  let scheduleMessage = "配信予定を取得しました";
  let schedule = shared ?? [];

  if (shared === null) {
   try {
    const now = Date.now();
    schedule = websiteSchedule(await readSchedule(commonHeaders, user.id, CHANNEL_LOGIN, now), now);
   } catch {
    scheduleConfigured = false;
    scheduleMessage = "スケジュール取得失敗";
   }
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
   "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
   "Pragma": "no-cache",
   "Expires": "0"
  }
 });
}
