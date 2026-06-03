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

---

# Phase 3 — antirez course first-pass walkthroughs

Goal: produce **lean first-pass draft notes** for all 35 antirez transcripts
(02-37 minus 20 — random variables, no transcript). These are scaffolds the
author will revise after watching each video; do NOT over-author.

## Conventions per lesson
- Frontmatter: `id`, `chapter`, `label`, `title`, `prev`, `next`, `status: draft`,
  `source: { videoId, url, duration? }`. Use values already in `manifest.json`.
- Body: short TL;DR (1-3 sentences), brief walkthrough with `[MM:SS]` timestamps
  from the transcript, **1-2** inline `c:run` blocks if a small runnable snippet
  fits, a short "Try it" list, and a one-line cross-ref to K&R when obvious.
- Length target: ~50-120 lines. Do not bloat. The user revises later.
- For multi-part series (Toy Forth, ZX Spectrum) and other "code review of
  large existing project" videos, write the walkthrough as prose with short
  *non-runnable* `c` snippets only — full project code lives outside this site.
- Every `c:run` block that has an `output` fence MUST pass `playground/verify.py`.
- Update `manifest.json` status `stub` → `draft` for each authored lesson.
- One atomic commit per lesson: `docs(antirez/NN-slug): first-pass draft`.

## Tasks (playlist order)
- [x] 02 Dismantling Hello, world — stdio, headers, functions (Z84vlG1RRtg)
- [x] 03 Lifetime of local variables                    (r6mU_IHXEps)
- [x] 04 Functions, expressions, and the increment operator (mw4gUqsGPZw)
- [x] 05 Integer types in depth                         (YNsXyasn4R4)
- [x] 06 Chars and strings as char arrays               (SWWHqgSwQFw)
- [x] 07 if, goto, recursion                            (lc7aYXNl1T8)
- [x] 08 while vs for, switch                           (HCRthhjbfAg)
- [x] 09 Conway's Game of Life                          (c5atNuYdKK8)
- [x] 10 Introduction to pointers                       (BBgZs-jd_QY)
- [x] 11 Pointer arithmetic                             (lc7hL9Wt-ho)
- [x] 12 Pointer clarifications                         (msGzuneFpDU)
- [x] 13 First encounter with malloc()                  (ZkaKwWXJXs8)
- [x] 14 Hidden metadata behind the pointer             (9AhaOdEBmPc)
- [x] 15 The structs of C                               (p4IMHau2lq8)
- [x] 16 Structs as data-structure bricks               (aTT2W5NACEY)
- [x] 17 String library with reference counting         (VPs_QtlLNcs)
- [x] 18 String design, hexdump()                       (grkIJjw6o18)
- [x] 19 Algorithm archaeology                          (soiBgJjAmP8)
- [x] 21 Opaque types, typedef, stdio files             (3w73xjUSUEU)
- [x] 22 System calls                                   (QWLJ7CBAu_I)
- [x] 23 libc buffering and mmap                        (yKavhObop5I)
- [x] 24 union and bitfield                             (TM4jgODgdFY)
- [x] 25 Pointers to functions                          (OIseV5lcx8w)
- [x] 26 Toy Forth (part 1)                             (vYODKK8TQGE)
- [x] 27 Toy Forth (part 2)                             (-QxrmHo-V7Y)
- [x] 28 Toy Forth (part 3)                             (-1ZhCgaIPOk)
- [x] 29 Toy Forth — exec() (part 4)                    (oMj3N6jYIUU)
- [x] 30 Toy Forth — function registration (part 5)     (C4AHEK3fSjg)
- [x] 31 Reference counting deep dive                   (QdZc1JV_oCw)
- [x] 32 Variadic functions                             (cvWbCx0lLjs)
- [x] 33 Toy Forth — first program                      (nHzlRqPnlrE)
- [x] 34 ZX Spectrum image (part 1)                     (D1U3uCe-kok)
- [x] 35 ZX Spectrum image (part 2)                     (fZmdsh0gQig)
- [x] 36 ZX Spectrum appendix                           (xaEr-XSlWfo)
- [x] 37 Rudiments of 3D graphics                       (4EofabMH41M)
- [x] Phase-3 build check + push

## Hiccups & Notes (phase 3)
- Lesson 20 stays `status: video-only` — Salvatore disabled transcripts on
  that one.
- **Slots 02, 04, 05, 06 were re-mapped** after batch 1: my initial manifest
  titles were guesses; the actual videos cover (02) dismantling Hello World,
  (04) functions/expressions, (05) integer types, (06) chars/strings. Ids,
  titles, and neighbouring prev/next pointers updated accordingly.
- **`strdup` segfaults under `-std=c11 -w`**: it's POSIX, not C11, so it gets
  an implicit-int decl that truncates the returned pointer. Replace with
  `malloc(strlen(s)+1) + strcpy`. Caught by `playground/verify.py` on lesson
  31; logged in `/memories/repo/learnc.md`.
- All 35 first-pass drafts pass `playground/verify.py`; the only remaining
  `[MISMATCH]` in the antirez folder is `_template.md`, which is intentional
  (the placeholder reminds authors to replace the body).
- Each lesson landed as a single atomic commit (`docs(antirez/<id>):
  first-pass draft`) and was pushed to `origin/main` immediately.
