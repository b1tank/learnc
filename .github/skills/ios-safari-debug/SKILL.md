---
name: ios-safari-debug
description: 'Debug a real iPhone''s Safari from a Linux (or Windows) workstation — no Mac required. Wraps libimobiledevice + ios-webkit-debug-proxy + a CDP driver into one workflow. Use when: a page works in desktop browsers but breaks on iPhone Safari, you need iPhone Safari Web Inspector but don''t have a Mac, you need to evaluate JS or stream console logs from an iPhone tab, or you need to inspect crossOriginIsolated / SharedArrayBuffer / COOP / COEP / service-worker / bfcache behavior on a real iPhone. Triggers: "debug ios safari", "debug iphone safari", "iphone safari devtools", "iphone web inspector without mac", "inspect iphone safari", "ios remote debug", "ios webkit debug proxy", "iwdp", "crossOriginIsolated on ios", "SAB on iphone", "service worker not intercepting on safari".'
---

# iOS Safari Debug

Drive a real iPhone's Safari from a Linux (or Windows) workstation — no Mac
required. Evaluate JS, stream console logs, and probe runtime state
(`crossOriginIsolated`, `SharedArrayBuffer`, service-worker registration,
response headers) — all from the terminal.

This is the equivalent of Safari Web Inspector that ships with macOS, but
built on top of [google/ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy)
so you can use it from any non-Apple host.

## When to Use

- A page works in desktop browsers but fails on mobile Safari
- Need to inspect `crossOriginIsolated`, `SharedArrayBuffer`, COOP/COEP, or
  service-worker behavior on a real iPhone
- Want to reproduce a stale-cache / bfcache issue that only surfaces on iOS
- Want to script repeatable iPhone checks (CI smoke tests, manual reload
  loops, header verification) without poking at the device by hand

## Preflight (always run this first)

**Agent instructions:** before suggesting any debug step, run `check.sh` and
read its output. It diagnoses every prerequisite layer in one pass and
prints a precise fix for whatever's missing. It is read-only — safe to run
any time.

```bash
.github/skills/ios-safari-debug/scripts/check.sh
```

What the exit code means:

| Code | Meaning | What you should do |
|------|---------|--------------------|
| 0 | All green | Proceed to [Usage](#usage) |
| 1 | Host packages missing | **Offer to run `install.sh`** on the user's behalf (it uses `sudo apt`, so confirm first if they didn't ask for installation) |
| 2 | iPhone not connected / not Trusted / locked | **Politely remind the user** to plug in, unlock, and tap "Trust This Computer". You cannot do this for them — it's a physical/security gate. |
| 3 | Everything installed, proxy not running | **Offer to run `start-proxy.sh`** (no sudo needed) |

### Friendly-reminder rules for the agent

When prerequisites are missing, *never* fail silently or dump a stack trace.
Instead:

1. Run `check.sh` and quote the relevant `[MISSING]` / `[WARN]` lines back to
   the user verbatim.
2. **If it's something you can fix:** offer to run the fix command and wait
   for confirmation. Examples: `install.sh`, `start-proxy.sh`, killing a
   stale proxy with `pkill -x ios_webkit_debug_proxy`.
3. **If it requires the user (physical access, iPhone settings):** give a
   short, numbered checklist of what they need to tap, and offer to re-run
   `check.sh` once they say they're done.
4. Web Inspector is invisible from the host — always mention it explicitly
   when no tabs show up: *"Open Settings → Safari → Advanced and confirm
   Web Inspector is ON."*

## Prerequisites (what `check.sh` verifies)

**On the host:**
- Linux (Ubuntu 22.04 tested; WSL2 + `usbipd-win` also works)
- `libimobiledevice` tools: `idevice_id`, `ideviceinfo`, `ideviceinstaller`
- `ios_webkit_debug_proxy` binary on `PATH`
- Python 3 with the `websockets` module
- `usbmuxd` daemon (usually auto-starts)

**On the iPhone:**
- Plugged in via USB, **unlocked**
- "Trust This Computer" granted (one-time pairing prompt)
- **Settings → Safari → Advanced → Web Inspector = ON**
- A Safari tab open on the page you want to inspect

## Setup (one time)

Install libimobiledevice and build `ios-webkit-debug-proxy`:

```bash
.github/skills/ios-safari-debug/scripts/install.sh
```

What it does:
1. `apt install` libimobiledevice tools, `ideviceinstaller`, `usbmuxd`, build deps
2. Clones `google/ios-webkit-debug-proxy`, configures, builds, `sudo make install`
3. Verifies `idevice_id -l` lists your phone
4. Installs the Python `websockets` module (used by [iosdbg.py](./scripts/iosdbg.py))

## Usage

### 1. Start the proxy

```bash
.github/skills/ios-safari-debug/scripts/start-proxy.sh
```

Backgrounds `ios_webkit_debug_proxy -F`. Devices show up on `http://localhost:9221/json`
and per-device DevTools endpoints on `http://localhost:9222/`, `:9223/`, …

### 2. Open Safari on the iPhone

Navigate to the page you want to inspect. Until a tab is open with Web Inspector
enabled, `iosdbg.py tabs` returns `[]`.

### 3. Drive it from the terminal

```bash
PY=.github/skills/ios-safari-debug/scripts/iosdbg.py

$PY tabs                                       # list inspectable Safari tabs
$PY eval --match learnc "self.crossOriginIsolated"
$PY eval --match learnc "$(cat probe.js)"      # multi-line JS via file
$PY logs --match learnc --for 30               # stream console for 30s
```

`--match <substr>` filters by URL or title. Without it, the first tab is used.

### Multi-line JS pattern

iOS WebKit's `Runtime.evaluate` returns whatever the expression evaluates to.
For async work, set a global from inside an IIFE then read it back:

```js
// probe.js
window.__out = null;
(async () => {
  const r = await fetch(location.href, { cache: 'no-store' });
  window.__out = {
    coi: self.crossOriginIsolated,
    sab: typeof SharedArrayBuffer !== 'undefined',
    coep: r.headers.get('cross-origin-embedder-policy'),
  };
})();
"started"
```

```bash
$PY eval --match learnc "$(cat probe.js)"
sleep 1
$PY eval --match learnc "JSON.stringify(window.__out)"
```

Why two calls: iOS WebKit honors `Runtime.evaluate` synchronously but is
inconsistent about `awaitPromise: true`. Setting a global + polling is the
reliable pattern.

## Protocol Gotchas (iOS 13+)

`ios-webkit-debug-proxy` exposes a Chrome DevTools-style WebSocket, but
**every CDP message must be wrapped in `Target.sendMessageToTarget`** and
responses arrive inside `Target.dispatchMessageFromTarget`. Sending bare
`Runtime.evaluate` gets you `'Runtime' domain was not found`.

[iosdbg.py](./scripts/iosdbg.py) handles the wrapping for you — see its `CDP`
class. If you need to extend it (DOM inspection, network capture, etc.),
just add new `await cdp.call("Domain.method", params)` calls; everything
goes through the same envelope.

## Common Diagnostic Snippets

### Cross-origin isolation health

```js
JSON.stringify({
  crossOriginIsolated: self.crossOriginIsolated,
  hasSAB: typeof SharedArrayBuffer !== 'undefined',
  swController: !!navigator.serviceWorker.controller,
  swState: navigator.serviceWorker.controller && navigator.serviceWorker.controller.state,
})
```

### Did the SW actually serve this navigation?

```js
JSON.stringify((() => {
  const n = performance.getEntriesByType('navigation')[0] || {};
  return { workerStart: n.workerStart, transferSize: n.transferSize, type: n.type };
})())
```

`workerStart: 0` and `transferSize: 0` mean Safari served the page from
bfcache and the SW was bypassed. Force a hard reload (or bust the SW URL
with a query string) to recover.

### Response headers from a real fetch

```js
window.__h = null;
fetch(location.href, { cache: 'no-store' }).then(async r => {
  window.__h = {
    coop: r.headers.get('cross-origin-opener-policy'),
    coep: r.headers.get('cross-origin-embedder-policy'),
    corp: r.headers.get('cross-origin-resource-policy'),
  };
});
"started"
```

## Cleanup

```bash
pkill ios_webkit_debug_proxy
```

The libimobiledevice/usbmuxd packages stay installed (they're cheap).

## Files

- [scripts/check.sh](./scripts/check.sh) — read-only preflight; always run first
- [scripts/install.sh](./scripts/install.sh) — installs apt deps, builds iwdp, pip-installs websockets
- [scripts/start-proxy.sh](./scripts/start-proxy.sh) — runs `ios_webkit_debug_proxy -F` in the background
- [scripts/iosdbg.py](./scripts/iosdbg.py) — CDP driver: `tabs`, `eval`, `logs`
