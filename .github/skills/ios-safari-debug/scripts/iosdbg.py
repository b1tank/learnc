#!/usr/bin/env python3
"""CDP driver for ios-webkit-debug-proxy (iOS 13+ Target-wrapping protocol)."""
import argparse
import asyncio
import itertools
import json
import sys
import urllib.error
import urllib.request

import websockets


def list_tabs(port: int = 9222) -> list[dict]:
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/json", timeout=3) as r:
            return json.loads(r.read())
    except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
        sys.exit(
            f"can't reach ios_webkit_debug_proxy on :{port} ({e}).\n"
            f"Friendly reminder: start it first with scripts/start-proxy.sh,\n"
            f"or run scripts/check.sh to diagnose the full setup."
        )


def pick_tab(match: str | None, port: int = 9222) -> dict:
    tabs = list_tabs(port)
    if not tabs:
        sys.exit(
            "no inspectable tabs on the iPhone yet. Common causes:\n"
            "  - Safari has no page open → open any URL on the phone\n"
            "  - Web Inspector is OFF → Settings → Safari → Advanced → Web Inspector\n"
            "  - iPhone is locked / not Trusted → run scripts/check.sh"
        )
    if match:
        filtered = [t for t in tabs if match in t.get("url", "") or match in t.get("title", "")]
        if not filtered:
            available = "\n  ".join(f"- {t.get('title','?')[:50]} :: {t.get('url','')[:80]}" for t in tabs)
            sys.exit(f"no tab matches {match!r}. Available tabs:\n  {available}")
        tabs = filtered
    return tabs[0]


class CDP:
    def __init__(self, ws):
        self.ws = ws
        self.target_id: str | None = None
        self._ids = itertools.count(1)
        self._pending: dict[int, asyncio.Future] = {}
        self._events: asyncio.Queue = asyncio.Queue()
        self._reader_task = asyncio.create_task(self._reader())

    async def _reader(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                if msg.get("method") == "Target.dispatchMessageFromTarget":
                    inner = json.loads(msg["params"]["message"])
                    if "id" in inner and inner["id"] in self._pending:
                        self._pending.pop(inner["id"]).set_result(inner)
                    else:
                        await self._events.put(inner)
                elif msg.get("method") == "Target.targetCreated":
                    self.target_id = msg["params"]["targetInfo"]["targetId"]
                elif "id" in msg and msg["id"] in self._pending:
                    self._pending.pop(msg["id"]).set_result(msg)
                else:
                    await self._events.put(msg)
        except websockets.ConnectionClosed:
            pass

    async def setup(self, timeout: float = 3.0):
        for _ in range(int(timeout * 10)):
            if self.target_id:
                return
            await asyncio.sleep(0.1)
        raise RuntimeError("never received Target.targetCreated")

    async def send_raw(self, method: str, params: dict | None = None):
        msg_id = next(self._ids)
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[msg_id] = fut
        await self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        return await asyncio.wait_for(fut, timeout=10)

    async def call(self, method: str, params: dict | None = None):
        if self.target_id is None:
            await self.setup()
        inner_id = next(self._ids)
        inner = json.dumps({"id": inner_id, "method": method, "params": params or {}})
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[inner_id] = fut
        await self.send_raw("Target.sendMessageToTarget", {"targetId": self.target_id, "message": inner})
        return await asyncio.wait_for(fut, timeout=15)

    async def events(self, timeout: float):
        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                return
            try:
                yield await asyncio.wait_for(self._events.get(), timeout=remaining)
            except asyncio.TimeoutError:
                return


async def with_tab(match, fn):
    tab = pick_tab(match)
    print(f"# tab: {tab['title']!r}", file=sys.stderr)
    async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=16 * 1024 * 1024) as ws:
        cdp = CDP(ws)
        try:
            await cdp.setup()
        except RuntimeError:
            pass
        await fn(cdp)


async def cmd_eval(expr: str, match: str | None):
    async def run(cdp: CDP):
        result = await cdp.call("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        if "error" in result:
            print("ERROR:", json.dumps(result["error"], indent=2)); sys.exit(1)
        r = result.get("result", {}).get("result", {})
        if r.get("subtype") == "error":
            print("THREW:", r.get("description", r)); sys.exit(1)
        print(json.dumps(r.get("value", r.get("description")), indent=2, default=str))
    await with_tab(match, run)


async def cmd_logs(match: str | None, duration: float):
    async def run(cdp: CDP):
        await cdp.call("Console.enable")
        await cdp.call("Runtime.enable")
        async for ev in cdp.events(duration):
            method = ev.get("method", "")
            params = ev.get("params", {})
            if method == "Console.messageAdded":
                m = params.get("message", {})
                print(f"[{m.get('level','?')}] {m.get('text','')}")
            elif method == "Runtime.consoleAPICalled":
                args = [a.get("value", a.get("description", "")) for a in params.get("args", [])]
                print(f"[{params.get('type','log')}] {' '.join(map(str, args))}")
            elif method == "Runtime.exceptionThrown":
                print(f"[exception] {params.get('exceptionDetails', {}).get('text','')}")
    await with_tab(match, run)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("tabs")
    e = sub.add_parser("eval"); e.add_argument("expr"); e.add_argument("--match", default=None)
    l = sub.add_parser("logs"); l.add_argument("--match", default=None); l.add_argument("--for", dest="duration", type=float, default=5.0)
    args = ap.parse_args()
    if args.cmd == "tabs":
        for t in list_tabs():
            print(f"{t.get('title','?')[:60]:60s}  {t.get('url','')}")
    elif args.cmd == "eval":
        asyncio.run(cmd_eval(args.expr, args.match))
    elif args.cmd == "logs":
        asyncio.run(cmd_logs(args.match, args.duration))


if __name__ == "__main__":
    main()
