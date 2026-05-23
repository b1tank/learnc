# learnc

> An interactive, hand-written companion to *The C Programming Language* (Kernighan & Ritchie, 2nd ed.). Every example and exercise runs in your browser.

**[→ open learnc](https://b1tank.github.io/learnc/)**

---

## What this is

A learning artifact. I am reading K&R cover-to-cover and writing a short rewrite of each section in my own words, with a runnable code editor next to the prose. The whole book — every section, every numbered exercise — is enumerated on the site. The ones I have not reached yet are stubs.

## What this isn't

- Not an LLM wrapper. **No AI-generated prose.** Every word of every lesson is written by a human reading K&R.
- Not a SaaS. **No signup. No tracking. No cookies. No analytics.** Your progress and edited code live in `localStorage`. That's it.
- Not a framework. Plain HTML, plain CSS, plain JS. One `marked.min.js` for markdown, one `codemirror@6` for the editor, one WebAssembly C compiler. Page weight under 1 MB.
- Not a startup. **MIT-licensed. Self-hostable. Fork it.**

## Why K&R in 2026

K&R is short, dense, and historically grounded. Its progression — `hello, world` → `for` → character I/O → arrays → pointers — is still one of the clearest paths into the language. What is dated is the *style*: pre-ANSI function declarations, `gets`, no `bool`, weak prototypes. learnc keeps K&R's structure and adds a **Modern note** wherever current C practice diverges.

## How it works

- Lessons live as `.md` files in [`lessons/`](lessons/), one per section or exercise.
- The site is two HTML files, one CSS file, three JS files.
- Code runs in your browser via a WebAssembly C compiler. **Compiler integration is the active milestone** — until it lands, the Run button shows a stub message.
- GitHub Pages hosts the whole thing for free.

## Architecture

```
learnc/
├── index.html          landing + lesson index
├── lesson.html         lesson view (editor + run + output)
├── style.css           ~200 lines, bellard-style aesthetic
├── app.js              index page logic
├── lesson.js           lesson loader + runner wiring (ES module)
├── editor.js           CodeMirror 6 setup (ES module)
├── runner.js           WASM C compiler interface (stub today)
├── humans.txt          who built it, what's inside, what's not
├── .nojekyll           GitHub Pages: serve files literally
└── lessons/
    ├── manifest.json   the full spine (all chapters, all exercises)
    ├── _template.md    skeleton for new lessons
    ├── README.md       lesson format reference
    └── *.md            one file per lesson
```

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

That's it. No npm install, no build, no config.

## Contributing

There are ~96 numbered exercises and ~77 sections across 8 chapters. Most are stubs. Pick one, write a walkthrough, send a PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE). The lesson prose is original work; K&R's *The C Programming Language* itself remains copyrighted by its authors and Pearson.
