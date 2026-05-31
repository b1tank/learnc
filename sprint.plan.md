# Sprint Plan — Ground-Up Lesson Overhaul

Goal: turn every lesson from "surface K&R for a high-level dev" into a **ground-up**
deep dive (headers → libc → syscalls → kernel → stack/heap/memory layout →
assembly/ABI) in the spirit of *Programming from the Ground Up*. Keep each lesson
**digestible**: tight prose, every example a runnable `c:run` block (reset/share/run
buttons + pass/fail badge), and good external hyperlinks (Wikipedia, cppreference,
man7, Godbolt) for readers who want more — without offloading the core idea.

## Conventions for every rewritten lesson
- Keep frontmatter (id/chapter/label/title/prev/next/status) **unchanged**.
- Replace `c:starter` + "Try it" + "Modern note"/"Notes from author" with:
  - Tight ground-up prose with an **under-the-hood** angle (ABI, syscall, memory).
  - Multiple inline `c:run <title>` blocks, each optionally followed by an output fence.
  - A short **Go deeper** list of hyperlinks at the end.
- Verify every output badge with `python3 playground/verify.py <file>` before commit.
- One atomic commit per lesson: `docs(<id>): ground-up rewrite`.

## Tasks (book order)
- [x] Infra: reset + share buttons on inline runnables (commit 5ba0865)
- [ ] Ch.1 sections 01-01 … 01-10
- [ ] Ch.1 exercises ex-1-*
- [ ] Ch.2 … Ch.8 sections + exercises
- [ ] Build check (bin/stamp) + push

## Hiccups & Notes
- gcc 11 `-std=c11 -w` does NOT error on implicit declaration (runs, returns 27),
  but the in-browser WASM clang DOES reject it — so "compile error" demo blocks
  must NOT carry an output fence (no badge). Verifier flags them `[error-demo OK]`.
- Verifier normalization = strip trailing whitespace of whole stdout (matches lesson.js).
