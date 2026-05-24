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

- [ ] 1. **fix:** harden `?id=` against path-traversal (S1)
- [ ] 2. **fix:** url-safe base64 for `#code=` share links (S4)
- [ ] 3. **fix:** manifest-cache retry on failed fetch (R6)
- [ ] 4. **fix:** debounce localStorage saves (R5)
- [ ] 5. **refactor:** drop IIFE in `app.js`; switch to module script (E1)
- [ ] 6. **refactor:** flexbox header layout replaces `float:right` clearfix (E4)
- [ ] 7. **refactor:** build stub notice via DOM nodes, not `innerHTML` (S5)
- [ ] 8. **feat:** banner when editor was overridden by `#code=` (S3/R7)
- [ ] 9. **feat:** filter chips on index — hide stubs by default (UX2/14)
- [ ] 10. **refactor:** move philosophy paragraphs below the fold on index (UX1)
- [ ] 11. **fix:** breadcrumb shows section title; no async flash (UX4/5/17)
- [ ] 12. **feat:** `← →` shortcut hint next to prev/next links (UX11)
- [ ] 13. **feat:** dark mode via `prefers-color-scheme` (UX19)
- [ ] 14. **feat:** skip-to-content link on both pages (UX18)
- [ ] 15. **docs:** honest authorship statement (M6/UX21)
- [ ] 16. **docs:** manifest format note (M4)

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

(filled in as work proceeds)

