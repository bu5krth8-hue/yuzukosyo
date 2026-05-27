# 累計アクセス数の設定

このZIPは、来場者数カウンターの修正版です。

## Cloudflare設定

Pages Functions の KV binding name は必ず以下にしてください。

```txt
SITE_STATS
```

## 仕様

- `/api/stats` にアクセスされるたびにカウントが +1 されます。
- GET / POST どちらでも増えます。
- 自分のアクセス、再読み込み、botも含みます。
- 正確なユニークユーザー数ではなく、ページ表示回数に近い数字です。


## v38 迷言投稿案の受信について

このZIPでは、迷言投稿案の受信にも Cloudflare KV を使います。
既存のアクセスカウンター用 KV binding `SITE_STATS` が設定済みなら、そのまま投稿案の受信にも使えます。
別のKVを使いたい場合は、binding name を `MEIGEN_SUBMISSIONS` にしてください。

- 投稿API: `/api/meigen-submit`
- 管理ページ: `yuzu-secret-meigen-control-2026.html`
- 管理ページで投稿案を「公開で追加」「非公開で保存」「削除」できます。
