# Contributing to learnc

learnc is a hand-written, runnable companion to K&R's *The C Programming Language* (2nd ed.). Every section and every numbered exercise has a slot on the site — most are stubs waiting for a walkthrough.

## What you can contribute

1. **Write a walkthrough.** Pick a stub from [the index](https://b1tank.github.io/learnc/), write a short explanation in your own words, add a starter code block. The site renders your `.md` file as-is.
2. **Fix a bug.** The site is plain HTML, CSS, and JavaScript. Open the files, edit, send a PR.
3. **Suggest a Modern note.** When K&R's code differs from current C, add a `## Modern note` callout.
4. **Verify the manifest.** Exercise counts and section titles are my best recollection of K&R 2e. Spotted an error? Open a PR.

## Ground rules

- **Hand-revised against K&R.** AI assistance is fine for drafts, brainstorming, or unblocking — but every line that ships must be read against K&R and rewritten in your own voice. The promise is "verified by a human," not "untouched by a tool."
- **No reproducing K&R text.** Paraphrase. The book is still copyrighted.
- **No frameworks, no build step.** Vanilla HTML, CSS, JavaScript. If you need a library, justify it in the PR.
- **Mobile-readable.** Lessons must read well on a phone, even when editing C on a phone is awkward.
- **Keep it dense.** A lesson is one screen of prose plus the runner. Substance, not filler.

## Adding a lesson — step by step

There's a tiny helper to skip the boilerplate. From the repo root:

```sh
bin/new-lesson              # shows progress + the next stub in reading order
bin/new-lesson next         # scaffolds the first stub (prev/next links pre-filled)
bin/new-lesson 01-04-define # scaffolds a specific id
bin/new-lesson done 01-04-define  # flips the manifest entry to status: done
```

`bin/new-lesson next` creates `lessons/<id>.md` with the right frontmatter,
flips the manifest entry to `status: draft` so the index shows it in-progress,
and prints the URL to open while editing. Sections and exercises get different
templates (exercises include a problem-statement placeholder and a solution
block).

If you'd rather scaffold by hand: copy [`lessons/_template.md`](lessons/_template.md)
to `lessons/<id>.md`, fill in the frontmatter (`id`, `chapter`, `label`, `title`,
`prev`, `next`, `status`), and add `"status": "draft"` to the matching entry in
[`lessons/manifest.json`](lessons/manifest.json) on the same one-line item.

Then:

1. Write 2–3 paragraphs of prose, one `c:starter` fenced block, optionally one `output` block.
2. Add a `What's going on` list, a `Modern note` if applicable, and a `Try it` section.
3. Visit `lesson.html?id=<id>` locally to preview.
4. When the lesson is finished, `bin/new-lesson done <id>` (or change `"draft"` → `"done"` in the manifest by hand).
5. Open a PR.

## Running locally

```sh
bin/dev                  # hot-reload dev server (recommended)
# or: bin/serve          # quiet static server, no injection
# or: python3 -m http.server 8000
```

`bin/dev` watches `*.html`, `*.css`, `*.js`, `lessons/*.md`, and `lessons/*.json`.
Save any of them and the browser auto-reloads. CodeMirror editor state survives
the reload because it's persisted to `localStorage` on every keystroke.

In VS Code, hit **F5** and pick **"learnc: dev server (hot reload)"** (uses the
Microsoft Python extension's debugger), or run **Tasks: Run Task → learnc: dev**
from the command palette (no extension required).

No npm install. No build. Drop a `.md` in `lessons/`, flip the manifest entry,
the browser refreshes.

## The lesson file format

See [`lessons/_template.md`](lessons/_template.md) for the skeleton and [`lessons/01-01-hello.md`](lessons/01-01-hello.md) for a real example.

Two fenced code blocks are special:

- ` ```c:starter ` — loaded into the editor when the lesson opens
- ` ```output ` — when present, the runner compares actual stdout to this expected text and shows a ✓/✗ badge

Everything else is plain markdown rendered by [marked](https://marked.js.org/).

## Tone

Read [`lessons/01-01-hello.md`](lessons/01-01-hello.md) for the voice. Short sentences. Concrete examples. No hype. No "amazing" or "powerful". No emoji. Treat the reader as a smart adult who can handle being told the truth about C.

## Code of conduct

Be kind. Argue about C, not about people. This is a learning project.
