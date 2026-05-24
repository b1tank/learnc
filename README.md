# learnc

> An interactive, hand-written companion to *The C Programming Language* (Kernighan & Ritchie, 2nd ed.). Every example and exercise runs in your browser.

**[→ open learnc](https://b1tank.github.io/learnc/)**

---

## What this is

A learning artifact. I am reading K&R cover-to-cover and writing a short rewrite of each section in my own words, with a runnable code editor next to the prose. The whole book — every section, every numbered exercise — is enumerated on the site. The ones I have not reached yet are stubs.

## What this isn't

- Not an LLM wrapper. **No AI-generated prose.** Every word of every lesson is written by a human reading K&R.
- Not a SaaS. **No signup. No tracking. No cookies. No analytics.** Your progress and edited code live in `localStorage`. That's it.
- Not a framework. Plain HTML, plain CSS, plain JS. One `marked.min.js` for markdown, one `codemirror@6` for the editor, [Runno](https://runno.dev) as the WebAssembly C compiler, [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) to enable `SharedArrayBuffer` on static hosts. Page weight: tiny site, ~10–15 MB of clang+libc downloaded lazily on first Run and then cached.
- Not a startup. **MIT-licensed. Self-hostable. Fork it.**

## Why K&R in 2026

K&R is short, dense, and historically grounded. Its progression — `hello, world` → `for` → character I/O → arrays → pointers — is still one of the clearest paths into the language. What is dated is the *style*: pre-ANSI function declarations, `gets`, no `bool`, weak prototypes. learnc keeps K&R's structure and adds a **Modern note** wherever current C practice diverges.

## How it works

- Lessons live as `.md` files in [`lessons/`](lessons/), one per section or exercise.
- The site is two HTML files, one CSS file, three JS files.
- Code runs in your browser via [Runno](https://runno.dev)'s WebAssembly build of clang + wasi-libc. The first Run lazily downloads ~10–15 MB of WASM blobs from `assets.runno.run`; subsequent runs are instant.
- [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) registers a service worker that injects `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` response headers so that `SharedArrayBuffer` is available. GitHub Pages cannot set those headers on its own; the SW handles it. First visit auto-reloads once after the SW installs.
- GitHub Pages hosts the whole thing for free.

## Known limitations

- **Compile-time errors lose their diagnostic text.** Runno's `headlessRunCode` API serializes the prepare-step exception down to `{message, type}` and drops the captured clang stderr. So today a typo gives you a generic "compilation failed" message, not `error: implicit declaration of function 'pirntf'`. Runtime errors (non-zero exit after a successful compile) still show stderr correctly. Fixing this needs either a Runno PR or a switch to a lower-level WASI runtime.
- **First Run is slow.** ~10–15 MB cold download.

## Architecture

```
learnc/
├── index.html          landing + lesson index
├── lesson.html         lesson view (editor + run + output)
├── style.css           ~200 lines, bellard-style aesthetic
├── app.js              index page logic
├── lesson.js           lesson loader + runner wiring (ES module)
├── editor.js           CodeMirror 6 setup (ES module)
├── runner.js           WebAssembly C compiler (Runno)
├── coi-serviceworker.js COOP/COEP shim so SAB works on static hosts
├── humans.txt          who built it, what's inside, what's not
├── .nojekyll           GitHub Pages: serve files literally
├── .vscode/             launch + tasks for the dev server (optional)
├── bin/
│   ├── dev               dev server with hot reload (recommended)
│   ├── new-lesson        scaffold the next lesson from the manifest
│   └── serve             quiet static server (no injection)
└── lessons/
    ├── manifest.json   the full spine (all chapters, all exercises)
    ├── _template.md    skeleton for new lessons
    ├── README.md       lesson format reference
    └── *.md            one file per lesson
```

## Running locally

```sh
bin/dev                  # hot-reload dev server (recommended)
# or: bin/serve          # quiet static server, no injection
# or: python3 -m http.server 8000
```

`bin/dev` watches every `.html`, `.css`, `.js`, and `lessons/*.md` file and
auto-reloads the browser when any of them change. Pure Python stdlib — no npm,
no watcher daemon. Pick the first free port from 8000.

In VS Code, hit **F5** and pick **"learnc: dev server (hot reload)"**, or run
**Tasks: Run Task → learnc: dev** from the command palette. The `.vscode/`
folder is committed to the repo so this works out of the box.

That's it. No npm install, no build, no config.

## Authoring flow

There's a small helper in `bin/` to skip the boilerplate when writing a new lesson:

```sh
bin/new-lesson              # show progress + the next stub
bin/new-lesson next         # scaffold the next stub (prev/next links pre-filled)
bin/new-lesson 01-04-define # scaffold a specific id
bin/new-lesson done 01-04-define   # mark a draft as done in the manifest
```

It writes `lessons/<id>.md` from the right template (section vs. exercise),
fills in the frontmatter from `lessons/manifest.json`, and surgically bumps the
manifest entry to `status: draft`. Open the URL it prints in your browser and
start writing.

## Contributing

There are 97 numbered exercises and 77 sections across 8 chapters. Most are stubs. Pick one, write a walkthrough, send a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Inspiration

This project is inspired by [a talk by antirez](https://www.youtube.com/watch?v=LermwGD7msg) (Salvatore Sanfilippo — author of Redis; see [invece.org](http://invece.org/)). The visual style borrows from his site and from [bellard.org](https://bellard.org/) — dense, monospace, no-frills web pages where substance shows through directly.

## License

MIT — see [LICENSE](LICENSE). The lesson prose is original work; K&R's *The C Programming Language* itself remains copyrighted by its authors and Pearson.
