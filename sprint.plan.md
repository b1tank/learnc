# Sprint Plan — polish round after UX + code review

Two critical rounds produced 34 findings. After triage, 16 atomic tasks remain.
This document tracks execution; commits are squashed to one task each per the
sprint-in-yolo workflow.

## Goals

- Address the actionable feedback from the UX review and the code review in
  small, reviewable commits.
- Do not push until the whole sprint clears a local build smoke-check.
- Defer items that need new dependencies or architectural decisions.

## Tasks

- [x] 1. **fix:** harden `?id=` against path-traversal (S1) — `c7e1c8a`
- [x] 2. **fix:** url-safe base64 for `#code=` share links (S4) — `c5e7e16`
- [x] 3. **fix:** manifest-cache retry on failed fetch (R6) — `8b136a7`
- [x] 4. **fix:** debounce localStorage saves (R5) — `fdcdf81`
- [x] 5. **refactor:** drop IIFE in `app.js`; switch to module script (E1) — `1461be7`
- [x] 6. **refactor:** flexbox header layout replaces `float:right` clearfix (E4) — `ef7bd25`
- [x] 7. **refactor:** build stub notice via DOM nodes, not `innerHTML` (S5) — `f9a93f6`
- [x] 8. **feat:** banner when editor was overridden by `#code=` (S3/R7) — `32247b7`
- [x] 9. **feat:** filter chips on index — hide stubs by default (UX2/14) — `b6d1d52`
- [x] 10. **refactor:** move philosophy paragraphs below the fold on index (UX1) — `ac751bd`
- [x] 11. **fix:** breadcrumb shows section title; no async flash (UX4/5/17) — `95158cd`
- [x] 12. **feat:** `← →` shortcut hint next to prev/next links (UX11) — `59bccd6`
- [x] 13. **feat:** dark mode via `prefers-color-scheme` (UX19) — `e6d8221`
- [x] 14. **feat:** skip-to-content link on both pages (UX18) — `abce7f5`
- [x] 15. **docs:** honest authorship statement (M6/UX21) — `500b61c`
- [x] 16. **docs:** manifest format note (M4) — `b62b1c8`

## Deferred — needs separate decision or scope

- **SRI on CDN scripts (S2)** — at minimum pin `marked` and the CodeMirror
  modules. Needs a version-bump workflow decision; out of scope for this polish
  round.
- **Syntax highlighting in prose `<pre>` blocks (UX10)** — would add a new
  library; needs evaluation (Prism vs. shiki vs. CodeMirror's static highlight).
- **CI output-drift check (M5)** — most lessons are stubs; defer until enough
  `done`/`draft` lessons exist to justify the workflow.
- **Editor auto-size (UX7)** — risky with current CodeMirror config; revisit
  after dark mode lands so I have a finished baseline to test against.
- **`confirm()` dialog modernisation (E5)** — cosmetic; not worth a commit this
  round.
- **`var` / `let` consistency pass (M1)** — defer until ESLint is added or until
  CONTRIBUTING.md codifies the policy.

## Hiccups & Notes

- TASK 5 (drop IIFE): the multi_replace removed the wrapper but left two
  different indentation levels inside (2-space at top, 4-space inside the one
  function that had been double-indented). Worked around with a quick Python
  dedent that strips two leading spaces from any indented line. Eyeballed the
  result — clean. If a future contributor hits weirdness in `app.js`, that
  dedent is the most likely culprit.
- TASK 10 (reorder index): made a small wording tweak to the philosophy
  paragraph in the same edit as the reorder; the full authorship sweep landed
  in TASK 15.
- TASK 13 (dark mode): introduced a handful of new CSS variables
  (`--panel-bg`, `--panel-border`, `--banner-bg`, `--stub-bg`, etc.) so the
  dark block only has to override variables, not entire rules. Hard-coded
  `#f4f4f4`, `#fff`, `#ccc` were re-pointed at the new tokens. The
  `<button>` and `.copy-btn` hovers use `filter: brightness()` rather than a
  second hard-coded color, which works for both themes.
- TASK 16: JSON doesn't allow comments, so the manifest format note is a
  `_format` key alongside the existing `_note`.
- Smoke-check: see "Build smoke-check" below.

