# Perf sprint — lean & fast, May 2026

Goal: drive the lesson-page Lighthouse score from 91 → as close to 100 as
GitHub Pages + COOP/COEP physics allow, without adding a build step,
without breaking SharedArrayBuffer (needed for the WASM C compiler),
and without making the code harder to read.

## Baseline (prod, mobile, Lighthouse 11 simulated 4G+4×CPU)

| Page   | Score | FCP   | LCP   | TBT  | CLS   | SI    | Transfer |
|--------|------:|------:|------:|-----:|------:|------:|---------:|
| index  | 100   | 835   | 1547  | 0    | 0.047 | 835   | 21 KiB   |
| lesson | 91    | 958   | 3229  | 71   | 0.077 | 1153  | 27 KiB   |

Top opportunities on lesson.html:
- 803 ms "redirects" — the COI service worker's first-visit reload.
  Lighthouse counts it as a wasted redirect; real users only pay this
  once per browser. Not fixable without dropping SharedArrayBuffer.
- 310 ms "unminified JavaScript" — would require a build step, which
  this project intentionally refuses (learning resource). Out of scope.

Heaviest bytes: marked.min.js (11.8 KB), lesson.js (7.1 KB), style.css
(3.9 KB), lesson.html (3.9 KB). Nothing fat to trim.

## Plan (atomic, prioritised)

1. **drop `cache: "no-cache"` on hot fetches** — lesson.md + manifest in
   `lesson.js` and `app.js`. Each `no-cache` forces a revalidation
   round-trip on every navigation; saves ~50–300 ms per repeat visit.
2. **preload the lesson markdown via inline `?id=` script** — extend the
   existing inline title-hint in `lesson.html` to also inject a
   `<link rel=preload as=fetch crossorigin>` for the `.md` file. Lets
   the browser kick off the fetch in parallel with HTML parse instead
   of waiting for `lesson.js` to run.
3. **modulepreload for unconditional shared scripts** — `theme.js` and
   `shortcuts.js` are imported by every page. Adding `<link
   rel=modulepreload>` flattens the discovery waterfall.

After each task: re-run `bin/perf`, commit, move on.

## Hiccups & Notes

- The redirect/SW cost is fundamental to GitHub-Pages + SAB. Documented
  here so future "why didn't this go to 100?" questions have an answer.
- JS minification is intentionally out of scope per project charter.
- Lighthouse 12 has a trace-engine crash on this site; `bin/perf`
  defaults to LH 11 until upstream ships a fix.
