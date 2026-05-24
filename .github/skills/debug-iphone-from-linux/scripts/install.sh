#!/usr/bin/env bash
# Install prerequisites for iOS Safari remote debugging on Linux.
# Tested on Ubuntu 22.04. Idempotent — safe to re-run.
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
    echo "this installer targets Linux (Ubuntu/Debian). For macOS, use Safari's built-in Develop menu instead." >&2
    exit 1
fi

cmd_exists() { command -v "$1" >/dev/null 2>&1; }

# 1. libimobiledevice + build deps
if ! cmd_exists idevice_id || ! cmd_exists ideviceinstaller; then
    echo "==> installing libimobiledevice + ideviceinstaller + build deps"
    sudo apt update
    sudo apt install -y \
        libimobiledevice-utils \
        ideviceinstaller \
        libplist-dev \
        libimobiledevice-dev \
        usbmuxd \
        autoconf \
        automake \
        libtool \
        pkg-config \
        libssl-dev \
        git \
        build-essential
else
    echo "==> libimobiledevice tools already present"
fi

# 2. ios-webkit-debug-proxy (build from source — not packaged on Ubuntu 22.04)
if ! cmd_exists ios_webkit_debug_proxy; then
    echo "==> building ios-webkit-debug-proxy from source"
    src=$(mktemp -d)
    trap 'rm -rf "$src"' EXIT
    git clone --depth=1 https://github.com/google/ios-webkit-debug-proxy.git "$src/iwdp"
    cd "$src/iwdp"
    ./autogen.sh
    make -j"$(nproc)"
    sudo make install
    sudo ldconfig
else
    echo "==> ios_webkit_debug_proxy already installed: $(command -v ios_webkit_debug_proxy)"
fi

# 3. Python websockets (used by iosdbg.py)
if ! python3 -c 'import websockets' 2>/dev/null; then
    echo "==> pip-installing websockets"
    python3 -m pip install --quiet --user websockets
else
    echo "==> python websockets already importable"
fi

# 4. Verify device is visible
echo
echo "==> checking for connected iPhone (must be unlocked + Trusted)"
if udid=$(idevice_id -l 2>/dev/null | head -1) && [[ -n "$udid" ]]; then
    name=$(ideviceinfo -k DeviceName 2>/dev/null || echo "?")
    osver=$(ideviceinfo -k ProductVersion 2>/dev/null || echo "?")
    echo "    found: $name (iOS $osver, UDID $udid)"
    echo
    echo "Setup complete. Next steps:"
    echo "  1. Enable Web Inspector on the phone: Settings -> Safari -> Advanced -> Web Inspector"
    echo "  2. Run scripts/start-proxy.sh"
    echo "  3. Open a page in mobile Safari, then: scripts/iosdbg.py tabs"
else
    echo "    no device found. Plug in your iPhone, unlock it, tap 'Trust This Computer',"
    echo "    then re-run this installer (or just run: idevice_id -l)"
fi
