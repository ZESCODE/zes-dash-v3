#!/data/data/com.termux/files/usr/bin/bash
# up.sh — start zes-os support services (idempotent)
#   gw-proxy   :4400  ZESRouter primary / 9Router fallback (claude+codex)
#   zeso       orchestrator daemon
#   lightpanda CDP :9222 (inside proot debian)
LOG=~/zes-os/logs
mkdir -p "$LOG" ~/.zes/os

pid_of() { pgrep -f "$1" | head -1; }

# 1) gateway proxy
if ! pid_of "node .*gw-proxy.mjs" >/dev/null 2>&1 && ! curl -s --max-time 2 -o /dev/null http://127.0.0.1:4400/v1/models; then
  setsid -f node ~/zes-os/gw-proxy.mjs </dev/null >>"$LOG/gw-proxy.log" 2>&1 &
  echo "gw-proxy started"
else echo "gw-proxy already up"; fi

# 2) orchestrator daemon
if ! curl -s --max-time 2 file:///dev/null >/dev/null 2>&1 && [ -f ~/.zes/os/daemon.pid ] && kill -0 "$(cat ~/.zes/os/daemon.pid)" 2>/dev/null; then
  echo "zeso already up"
else
  setsid -f node ~/zes-os/zeso.mjs worker </dev/null >>"$LOG/zeso-daemon.log" 2>&1 &
  echo "zeso daemon started"
fi

# 3b) dashboard-v3 (:7070)
if ! curl -s --max-time 2 -o /dev/null http://127.0.0.1:7070/api/status; then
  setsid -f node ~/zes-os/dashboard-v3/server.mjs </dev/null >>"$LOG/dash-v3.log" 2>&1 &
  echo "dash-v3 started"
else echo "dash-v3 already up"; fi

# 3) lightpanda in proot-debian (only if CDP down)
if ! curl -s --max-time 2 -o /dev/null http://127.0.0.1:9222/json/version; then
  setsid -f proot-distro login debian -- bash -c 'exec /tmp/lp/lightpanda serve --host 127.0.0.1 --port 9222' </dev/null >>"$LOG/lightpanda.log" 2>&1 &
  echo "lightpanda starting (CDP :9222)"
else echo "lightpanda already up"; fi

sleep 2
echo "--- health ---"
printf "4400:%s " "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:4400/v1/models)"
printf "9222:%s\n" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:9222/json/version)"
