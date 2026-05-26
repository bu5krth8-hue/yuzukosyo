export async function onRequestGet(context) {
  return handleStats(context, false);
}

export async function onRequestPost(context) {
  return handleStats(context, true);
}

async function handleStats(context, shouldIncrement) {
  const env = context.env || {};
  const kv = env.SITE_STATS;

  if (!kv) {
    return json({
      configured: false,
      total: 0,
      message: "Cloudflare KV binding「SITE_STATS」が未設定です"
    }, 200);
  }

  try {
    const key = "total_access";
    const currentValue = await kv.get(key);
    const current = Number.parseInt(currentValue || "0", 10);
    const safeCurrent = Number.isFinite(current) ? current : 0;

    const total = shouldIncrement ? safeCurrent + 1 : safeCurrent;

    if (shouldIncrement) {
      await kv.put(key, String(total));
    }

    return json({
      configured: true,
      total,
      message: shouldIncrement ? "アクセス数を更新しました" : "アクセス数を取得しました"
    });
  } catch (error) {
    return json({
      configured: false,
      total: 0,
      message: "アクセス数の処理に失敗しました",
      error: error.message
    }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
