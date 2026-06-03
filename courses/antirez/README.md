# antirez &middot; *Impariamo il C* &mdash; learnc

Companion notes to [*Impariamo il C*](https://www.youtube.com/playlist?list=PLAVQTHrAQwHfa1mPJ41sm-eu-IFvuZuiv)
by [Salvatore Sanfilippo](https://antirez.com) (creator of Redis) &mdash;
a 37-episode walk through the C language and the craft of writing real
programs in it.

## Source

- YouTube playlist: <https://www.youtube.com/playlist?list=PLAVQTHrAQwHfa1mPJ41sm-eu-IFvuZuiv>
- Author: Salvatore Sanfilippo (`antirez`)
- Per-lesson `videoId` is recorded in [`manifest.json`](manifest.json).

## Layout

```
courses/antirez/
├── README.md          (this file)
├── manifest.json      chapter / lesson table of contents (+ videoId per lesson)
├── lessons/
│   ├── _template.md   authoring template
│   └── NN-slug.md     one file per video, numbered in playlist order
└── transcripts/       gitignored regenerable working artifacts
    ├── it/            source-language transcripts
    └── en/            translated working notes
```

`transcripts/` is intentionally **excluded from git** (`.gitignore`).
Re-generate locally with `bin/fetch-antirez-transcripts`. The published
site &mdash; and every commit &mdash; ships only the hand-authored
lessons in `lessons/`.

## Authoring conventions

Each lesson follows the [`_template.md`](lessons/_template.md) shape:

1. **TL;DR** &mdash; one paragraph distilling the whole video.
2. **Walkthrough** &mdash; segment-by-segment summary, with `[MM:SS]`
   timestamps citing the source video for readers who want more detail.
   Includes inline ` ```c:run ` blocks (editable + runnable in-browser).
3. **Modern note** &mdash; flag any spot where the video's style differs
   from current best practice.
4. **Try it** &mdash; small experiments for the reader.
5. **Cross-reference to K&amp;R** &mdash; link to the matching section in
   [`courses/kr/`](../kr/).
6. **Go deeper** &mdash; manpages, blog posts, follow-up reading.

Status values in the manifest: `done`, `draft`, `stub`, `video-only`
(for episodes without an accessible transcript).

## Live site

- Index: <https://b1tank.github.io/learnc/antirez.html>
- Individual lesson: <https://b1tank.github.io/learnc/lesson.html?course=antirez&id=01-hello-world>
