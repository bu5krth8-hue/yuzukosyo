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
