const MAX_IMAGE_CHARS = 9_000_000
const DEFAULT_MODEL = 'gpt-4o-mini'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function safeString(value, maxLength = 100) {
  return String(value || '').slice(0, maxLength)
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') {
    return payload.output_text.trim()
  }

  const parts = []

  if (Array.isArray(payload?.output)) {
    for (const item of payload.output) {
      if (!Array.isArray(item?.content)) continue

      for (const content of item.content) {
        if (typeof content?.text === 'string') {
          parts.push(content.text)
        }
      }
    }
  }

  return parts.join('\n').trim()
}

export async function onRequestPost({ request, env }) {
  try {
    const apiKey = env.OPENAI_API_KEY

    if (!apiKey) {
      return jsonResponse({
        ok: false,
        error: 'サーバーOCRを使うには、Cloudflare Pages の環境変数 OPENAI_API_KEY を設定してください。',
        code: 'missing_openai_api_key',
      }, 503)
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.imageDataUrl !== 'string') {
      return jsonResponse({
        ok: false,
        error: '画像データを受け取れませんでした。もう一度写真を選び直してください。',
        code: 'missing_image',
      }, 400)
    }

    const imageDataUrl = body.imageDataUrl

    if (!imageDataUrl.startsWith('data:image/')) {
      return jsonResponse({
        ok: false,
        error: '画像形式を確認できませんでした。JPGまたはPNG画像で試してください。',
        code: 'invalid_image',
      }, 400)
    }

    if (imageDataUrl.length > MAX_IMAGE_CHARS) {
      return jsonResponse({
        ok: false,
        error: '画像が大きすぎます。少し近くから撮り直すか、画像サイズを小さくして再試行してください。',
        code: 'image_too_large',
      }, 413)
    }

    const language = safeString(body.language, 40)
    const layout = safeString(body.layout, 40)
    const accuracy = safeString(body.accuracy, 40)
    const model = safeString(env.OPENAI_OCR_MODEL || DEFAULT_MODEL, 80)

    const prompt = `あなたは日本語OCR専用エンジンです。画像内の文字だけを正確に抽出してください。\n\n条件:\n- 説明文や前置きは書かない\n- 見えた文字だけを出力する\n- 改行は原文の読みやすさを保って整える\n- 読めない文字は無理に作らない\n- 日本語を優先する\n- 数字、英字、記号も見えた範囲で残す\n\n読み取り設定:\n- 言語: ${language || '日本語中心'}\n- 文章の向き: ${layout || '横書き中心'}\n- 精度: ${accuracy || '標準'}\n\n出力はOCR結果の本文だけにしてください。`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 110000)

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl },
            ],
          },
        ],
        max_output_tokens: 2200,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    const data = await openaiResponse.json().catch(() => null)

    if (!openaiResponse.ok) {
      const message = data?.error?.message || 'OCR APIでエラーが出ました。時間を置いて再試行してください。'
      return jsonResponse({
        ok: false,
        error: message,
        code: 'openai_api_error',
      }, openaiResponse.status)
    }

    const text = extractOutputText(data)

    if (!text) {
      return jsonResponse({
        ok: false,
        error: '文字を読み取れませんでした。明るい場所で、文字を大きく撮って再試行してください。',
        code: 'empty_ocr_result',
      }, 422)
    }

    return jsonResponse({
      ok: true,
      text,
      provider: 'server-openai',
      model,
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return jsonResponse({
      ok: false,
      error: aborted
        ? 'サーバーOCRの処理が長すぎたため中断しました。短い文章や小さめの画像で試してください。'
        : 'サーバーOCRで予期しないエラーが出ました。もう一度試してください。',
      code: aborted ? 'server_ocr_timeout' : 'server_ocr_failed',
    }, aborted ? 504 : 500)
  }
}

export async function onRequestGet() {
  return jsonResponse({
    ok: true,
    name: 'パシャ読み サーバーOCR API',
    message: 'POSTで画像を送るとOCRします。',
  })
}
