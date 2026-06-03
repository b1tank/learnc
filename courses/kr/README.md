# K&R 2e &mdash; learnc

A hand-revised, runnable companion to *The C Programming Language*
(Kernighan &amp; Ritchie, 2nd edition, 1988).

## Source

Brian W. Kernighan and Dennis M. Ritchie, *The C Programming Language*,
2nd edition (Prentice Hall, 1988). ISBN 0-13-110362-8.

This course paraphrases every section in plain modern English &mdash; we
never reproduce K&amp;R's text. Code examples are re-typed, exercises
are solved from scratch.

## Layout

```
courses/kr/
├── README.md          (this file)
├── manifest.json      chapter / lesson / exercise table of contents
└── lessons/
    ├── _template.md   authoring template
    ├── 01-01-...md    one file per section (label NN-NN)
    └── ex-N-M.md      one file per exercise
```

## Authoring

Use `bin/new-lesson` to scaffold the next stub:

```
bin/new-lesson              # list remaining stubs
bin/new-lesson next         # scaffold the first stub in reading order
bin/new-lesson done <id>    # mark a draft as done
```

See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) at the repo root for the
runnable-fence syntax and the local dev workflow.

## Live site

- Index: <https://b1tank.github.io/learnc/kr.html>
- Individual lesson: <https://b1tank.github.io/learnc/lesson.html?id=01-01-getting-started>
