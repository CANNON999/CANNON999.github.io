#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Prefer a normal Node installation; use the desktop runtime on this machine if needed.
if ! command -v node >/dev/null 2>&1; then
  portfolio_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$portfolio_runtime/node" ]; then export PATH="$portfolio_runtime:$PATH"; fi
fi
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '请先安装 Node.js 24 LTS，然后安装 pnpm 11.25.0。'
  exit 1
fi
if [ ! -d node_modules/astro ]; then
  printf '%s\n' '请先在此目录执行 pnpm install --frozen-lockfile。'
  exit 1
fi
export ASTRO_TELEMETRY_DISABLED=1
exec node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1
