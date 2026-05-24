#!/usr/bin/env bash
# Read-only preflight for iOS Safari Debug. Diagnoses every prerequisite
# layer (host packages, proxy binary, Python module, device pairing,
# Web Inspector, running proxy) and prints a clear fix for whatever is
# missing. Does NOT modify the system — safe to run any time.
#
# Exit codes:
#   0 — all green, ready to use scripts/iosdbg.py
#   1 — something on the host machine needs fixing (run install.sh)
#   2 — host is fine but the iPhone isn't ready (plug/unlock/trust/enable inspector)
#   3 — everything installed, just need to start the proxy (run start-proxy.sh)

set -u

here=$(cd "$(dirname "$0")" && pwd)
fail_host=0
fail_device=0
need_proxy=0

ok()    { printf '  \033[32m[OK]\033[0m      %s\n' "$1"; }
miss()  { printf '  \033[31m[MISSING]\033[0m %s\n' "$1"; }
warn()  { printf '  \033[33m[WARN]\033[0m    %s\n' "$1"; }
fix()   { printf '             \033[2m↳ %s\033[0m\n' "$1"; }

echo "==> Host machine"

# OS
case "$(uname -s)" in
    Linux)
        if grep -qi microsoft /proc/version 2>/dev/null; then
            ok "OS: Linux (WSL detected — make sure usbipd-win is forwarding the iPhone)"
        else
            ok "OS: Linux"
        fi
        ;;
    Darwin)
        warn "OS: macOS — you don't need this skill. Use Safari → Develop → <your iPhone>."
        ;;
    *)
        warn "OS: $(uname -s) — untested. Skill targets Linux/WSL."
        ;;
esac

# libimobiledevice CLI tools
for tool in idevice_id ideviceinfo ideviceinstaller; do
    if command -v "$tool" >/dev/null 2>&1; then
        ok "$tool: $(command -v "$tool")"
    else
        miss "$tool not found"
        fail_host=1
    fi
done

# ios_webkit_debug_proxy
if command -v ios_webkit_debug_proxy >/dev/null 2>&1; then
    ok "ios_webkit_debug_proxy: $(command -v ios_webkit_debug_proxy)"
else
    miss "ios_webkit_debug_proxy not found"
    fail_host=1
fi

# Python websockets
if python3 -c 'import websockets' 2>/dev/null; then
    ver=$(python3 -c 'import websockets; print(websockets.__version__)' 2>/dev/null)
    ok "python3 websockets module (v$ver)"
else
    miss "python3 websockets module not importable"
    fail_host=1
fi

# usbmuxd daemon
if pgrep -x usbmuxd >/dev/null 2>&1; then
    ok "usbmuxd daemon running"
else
    warn "usbmuxd daemon not running (will auto-start on first device access on most distros)"
fi

if [[ $fail_host -ne 0 ]]; then
    echo
    fix "Run: $here/install.sh"
    fix "It installs libimobiledevice, builds ios-webkit-debug-proxy, and pip-installs websockets."
    exit 1
fi

echo
echo "==> iPhone"

udid=$(idevice_id -l 2>/dev/null | head -1 || true)
if [[ -z "$udid" ]]; then
    miss "no iPhone visible to libimobiledevice"
    fix "Plug in the iPhone, unlock it, tap 'Trust This Computer' when prompted."
    fix "Then re-run this script. Verify manually with: idevice_id -l"
    fail_device=1
else
    ok "device visible: UDID $udid"
    name=$(ideviceinfo -k DeviceName 2>/dev/null || true)
    osver=$(ideviceinfo -k ProductVersion 2>/dev/null || true)
    if [[ -z "$name" ]]; then
        miss "device found but not paired/trusted (ideviceinfo failed)"
        fix "Unlock the iPhone and tap 'Trust This Computer' on the pairing prompt."
        fix "If you've never paired before, run: idevicepair pair"
        fail_device=1
    else
        ok "paired & trusted: $name (iOS $osver)"
    fi
fi

if [[ $fail_device -ne 0 ]]; then
    echo
    fix "Friendly reminder: the iPhone must be plugged in, UNLOCKED, and 'Trusted'."
    exit 2
fi

# Web Inspector check — can't probe directly, only indirectly via tab list.
# We note the user-facing toggle here so the agent can remind the user.
warn "Web Inspector toggle is host-invisible. Confirm on the phone:"
fix "Settings → Safari → Advanced → Web Inspector = ON"
fix "(only needs to be done once; persists across reboots)"

echo
echo "==> Proxy"

if pgrep -x ios_webkit_debug_proxy >/dev/null 2>&1; then
    ok "ios_webkit_debug_proxy running (PID $(pgrep -x ios_webkit_debug_proxy | head -1))"
    # Probe device DevTools endpoint for tabs
    if tabs_json=$(curl -fs --max-time 2 http://localhost:9222/json 2>/dev/null); then
        n=$(printf '%s' "$tabs_json" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
        if [[ "$n" -gt 0 ]]; then
            ok "found $n inspectable tab(s) on :9222"
        else
            warn "proxy is up but no inspectable tabs yet"
            fix "Open any page in mobile Safari on the iPhone."
            fix "If still empty: Settings → Safari → Advanced → Web Inspector might be OFF."
        fi
    else
        warn "proxy is up but :9222 not yet responding (give it a second, then: curl -s http://localhost:9222/json)"
    fi
else
    warn "ios_webkit_debug_proxy is not running"
    fix "Start it with: $here/start-proxy.sh"
    need_proxy=1
fi

echo
if [[ $need_proxy -ne 0 ]]; then
    echo "Almost there — host & device are ready, just start the proxy."
    exit 3
fi

echo "All green. Try: $here/iosdbg.py tabs"
exit 0
