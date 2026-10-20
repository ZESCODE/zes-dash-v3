#!/usr/bin/env bash
# start.sh — Termux VS Code Mobile Control Panel launcher
# 1. Verifies code-server is running on :8181 (fallback :8080)
# 2. Starts a lightweight HTTP server for the control panel static files
#    (React dashboard at :7070 includes /vscode, plus standalone panel at :3000)
# 3. Prints local URLs for the mobile browser

set -euo pipefail

CODE_URL="${CODE_SERVER_URL:-http://127.0.0.1:8181}"
CODE_ALT="${CODE_SERVER_ALT:-http://127.0.0.1:8080}"
PANEL_PORT="${PORT:-3000}"
DASH_PORT="${DASH_PORT:-7070}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▓▓▓ ZES Termux VS Code Control Panel ▓▓▓"
echo ""

# 1) Check code-server
if command -v curl >/dev/null 2>&1; then
  if curl -sf --max-time 2 "$CODE_URL" >/dev/null 2>&1; then
    echo "✓ code-server reachable at $CODE_URL"
  elif curl -sf --max-time 2 "$CODE_ALT" >/dev/null 2>&1; then
    echo "✓ code-server reachable at $CODE_ALT (fallback)"
    CODE_URL="$CODE_ALT"
  else
    echo "⚠ code-server not reachable at $CODE_URL or $CODE_ALT"
    echo "  Start it first:"
    echo "    code-server --auth none --bind-addr 0.0.0.0:8181 ~/zes-os"
    echo "  The panel will still open in mock mode."
  fi
elif command -v wget >/dev/null 2>&1; then
  if wget -qO- --timeout=2 "$CODE_URL" >/dev/null 2>&1; then
    echo "✓ code-server reachable at $CODE_URL"
  else
    echo "⚠ code-server not reachable at $CODE_URL"
  fi
else
  echo "⚠ curl/wget not found — skipping probe"
fi

# 2) Start standalone panel server (if dashboard build exists, also mention it)
PANEL_DIR="$ROOT/dashboard-v3/vscode-panel"
if [ -d "$PANEL_DIR" ]; then
  echo "→ Starting standalone panel server on http://localhost:$PANEL_PORT ..."
  if command -v python3 >/dev/null 2>&1; then
    PORT="$PANEL_PORT" nohup python3 "$PANEL_DIR/server.py" >/tmp/vscode-panel.log 2>&1 &
    echo "  (python3 http.server, log: /tmp/vscode-panel.log, pid $!)"
  elif command -v node >/dev/null 2>&1; then
    PORT="$PANEL_PORT" nohup node "$PANEL_DIR/server.js" >/tmp/vscode-panel.log 2>&1 &
    echo "  (node http, log: /tmp/vscode-panel.log, pid $!)"
  else
    echo "⚠ no python3/node found — serve $PANEL_DIR manually"
  fi
fi

# 3) Also ensure dashboard server (includes integrated /vscode route)
if [ -f "$ROOT/dashboard-v3/server/server.mjs" ]; then
  if curl -sf --max-time 1 "http://127.0.0.1:$DASH_PORT/api/status" >/dev/null 2>&1; then
    echo "✓ Dashboard already running on http://localhost:$DASH_PORT"
  else
    echo "→ Dashboard not running — start with:"
    echo "  cd $ROOT/dashboard-v3/client && npm run build"
    echo "  node $ROOT/dashboard-v3/server/server.mjs  # => http://localhost:$DASH_PORT"
  fi
fi

echo ""
echo "──────────────────────────────────────────────"
echo "  Dashboard (Frost + VS Code panel): http://localhost:$DASH_PORT/vscode"
echo "  Standalone panel (no build):       http://localhost:$PANEL_PORT"
echo "  Code-server (desktop UI):          $CODE_URL"
echo "  WebSocket:                         ${CODE_URL/http/ws}"
echo "──────────────────────────────────────────────"
echo ""
echo "Open one of the URLs above in Android Chrome/Firefox."
