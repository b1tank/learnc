#!/usr/bin/env bash
# Start ios_webkit_debug_proxy in the background, suppressing the noisy
# per-packet hex dumps. Re-running kills the previous instance first so this
# script is safe to invoke repeatedly.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)

if ! command -v ios_webkit_debug_proxy >/dev/null 2>&1; then
    cat >&2 <<EOF
ios_webkit_debug_proxy is not installed yet.

Quick fix:
    $here/install.sh

(Installs libimobiledevice, builds the proxy, and pip-installs websockets.
Idempotent — safe to re-run.)
EOF
    exit 1
fi

if pgrep -x ios_webkit_debug_proxy >/dev/null; then
    echo "==> killing existing proxy"
    pkill -x ios_webkit_debug_proxy || true
    sleep 0.5
fi

if ! idevice_id -l 2>/dev/null | grep -q .; then
    cat >&2 <<EOF
No iPhone visible to libimobiledevice.

Friendly checklist:
    1. Plug the iPhone into this machine over USB
    2. Unlock the iPhone (the screen must be on)
    3. When the iPhone asks "Trust This Computer?", tap Trust
    4. Verify with:  idevice_id -l

Full preflight (recommended): $here/check.sh
EOF
    exit 1
fi

logfile=${IWDP_LOG:-/tmp/iwdp.log}
echo "==> starting ios_webkit_debug_proxy in background (log: $logfile)"
nohup ios_webkit_debug_proxy -F >"$logfile" 2>&1 &
disown
sleep 1

# Print the device URL so the caller knows where to point a browser
echo "==> devices:"
curl -s http://localhost:9221/json 2>/dev/null \
    | python3 -m json.tool 2>/dev/null \
    || echo "    (proxy not yet listening — wait a moment and re-run iosdbg.py tabs)"

echo
echo "Next: open a page in Safari on the iPhone, then:"
echo "  $(dirname "$0")/iosdbg.py tabs"
