export async function onRequest(context) {

  const CLIENT_ID = context.env.TWITCH_CLIENT_ID;
  const CLIENT_SECRET = context.env.TWITCH_CLIENT_SECRET;

  // Twitchアクセストークン取得
  const tokenResponse = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST"
    }
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  // LIVE情報取得
  const twitchResponse = await fetch(
    "https://api.twitch.tv/helix/streams?user_login=yuzukosyo07",
    {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": `Bearer ${accessToken}`
      }
    }
  );

  const twitchData = await twitchResponse.json();

  return Response.json(twitchData);

}