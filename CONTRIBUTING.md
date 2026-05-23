# Contributing to learnc

learnc is a hand-written, runnable companion to K&R's *The C Programming Language* (2nd ed.). Every section and every numbered exercise has a slot on the site — most are stubs waiting for a walkthrough.

## What you can contribute

1. **Write a walkthrough.** Pick a stub from [the index](https://b1tank.github.io/learnc/), write a short explanation in your own words, add a starter code block. The site renders your `.md` file as-is.
2. **Fix a bug.** The site is plain HTML, CSS, and JavaScript. Open the files, edit, send a PR.
3. **Suggest a Modern note.** When K&R's code differs from current C, add a `## Modern note` callout.
4. **Verify the manifest.** Exercise counts and section titles are my best recollection of K&R 2e. Spotted an error? Open a PR.

## Ground rules

- **No AI-generated prose.** This is the site's defining promise. Use AI to help you read C — sure — but write each explanation yourself, in your voice.
- **No reproducing K&R text.** Paraphrase. The book is still copyrighted.
- **No frameworks, no build step.** Vanilla HTML, CSS, JavaScript. If you need a library, justify it in the PR.
- **Mobile-readable.** Lessons must read well on a phone, even when editing C on a phone is awkward.
- **Keep it dense.** A lesson is one screen of prose plus the runner. Substance, not filler.

## Adding a lesson — step by step

1. Pick a stub from the index, e.g. `01-04-define`.
2. Copy [`lessons/_template.md`](lessons/_template.md) to `lessons/01-04-define.md`.
3. Fill in the frontmatter (`title`, `prev`, `next`, set `status: draft` or `done`).
4. Write 2–3 paragraphs of prose, one `c:starter` fenced block, optionally one `output` block, a `What's going on` list, a `Modern note` if applicable, and a `Try it` section.
5. In [`lessons/manifest.json`](lessons/manifest.json), add `"status": "draft"` (or `"done"`) to the matching item.
6. Visit `lesson.html?id=01-04-define` locally. It should load.
7. Open a PR.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

That is the whole setup. If you drop a `.md` file in `lessons/` and update `manifest.json`, it appears.

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
