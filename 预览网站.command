#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f dist/index.html ]; then
  printf '%s\n' '请先运行 pnpm build，或使用 scripts/dev.sh 开发预览。'
  exit 1
fi
printf '%s\n' '在浏览器打开 http://127.0.0.1:4321/ 查看第一版主页。按 Control+C 结束预览。'
exec python3 -m http.server 4321 --bind 127.0.0.1 --directory dist
