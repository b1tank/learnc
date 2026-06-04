---
id: NN-keyword
chapter: 1
label: "1.1"
title: A short descriptive title
prev: null
next: null
status: draft
source:
  videoId: XXXXXXXXXXX
  url: https://www.youtube.com/watch?v=XXXXXXXXXXX
  duration: "MM:SS"
---

> **Source video.** [Let's Learn C — lesson N](https://www.youtube.com/watch?v=XXXXXXXXXXX) (originally *Corso di programmazione in C — lezione N*) (Salvatore Sanfilippo, MM:SS).

## TL;DR

Two or three sentences distilling the entire video. Tell the reader what they will be able to do after this lesson, and which one concept matters most.

## Walkthrough

Plain-English prose summarising the video segment by segment. Cite timestamps in `[MM:SS]` brackets so a reader who wants the source can jump straight to that moment in the video. Do not transcribe; *translate the idea* into the shortest possible explanation.

```c:run
#include <stdio.h>

int main(void) {
    /* Inline runnable example. The reader can edit and re-run in place.
       Make every example self-contained and short enough to read at a glance. */
    return 0;
}
```

```output
optional — expected stdout. If present the runner shows a ✓/✗ badge.
```

Continue the walkthrough with one or two more `c:run` blocks if the video covers more than one idea. Each block stands alone — never assume the previous block was run.

## Modern note

A callout used whenever the video's 2019-era style or assumption differs from current best practice (e.g. implicit `int`, `gets`, missing `void` parameter lists, sloppy header inclusion). One short paragraph is enough — link out to a fuller treatment if you have one.

## Try it

1. A small experiment that makes the concept stick.
2. A variation that is likely to break — and what the error message means.
3. An open-ended challenge for the reader to extend the example.

## Cross-reference to K&R

Where this material lives in [the K&R companion course](../../../kr.html), if there is a direct mapping. Be explicit about gaps — e.g. "K&R covers `for` loops in 1.3 but does not discuss `goto`; antirez treats both in lesson 7".

## Go deeper

- Manpage links: `man 3 printf`, `man 7 signal`, ...
- One or two carefully chosen blog posts or papers.
- A pointer (no pun intended) to the next lesson in the chain.

End with a one-line lead-in to the next lesson, like:
*Click **next →** to ___.*
