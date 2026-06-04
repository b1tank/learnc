---
id: 08-while-for-switch
chapter: 3
label: "3.2"
title: while vs for, and the switch statement
prev: 07-if-goto-recursion
next: 09-game-of-life
status: draft
source:
  videoId: HCRthhjbfAg
  url: https://www.youtube.com/watch?v=HCRthhjbfAg
---

> **Source video.** [Corso di programmazione in C — lezione 7: ancora ricorsione, while = for, switch](https://www.youtube.com/watch?v=HCRthhjbfAg) by Salvatore Sanfilippo.

## TL;DR

Every `for` loop is just a `while` with extra slots for *init*, *test*, and *step* — once you see the rewrite, you can read any C loop. `switch` is C's multi-way branch on an integer value, with two sharp edges to remember: cases **fall through** unless you write `break`, and you can't declare a variable directly under a `case` label without opening a block.

## Walkthrough

### `for` is sugar for `while` `[09:36 → 10:58]`

The C `for (init; test; step) body` rewrites mechanically into `init; while (test) { body; step; }`. Salvatore demonstrates by deleting one piece of the `for` header at a time: drop the `init` and you initialise `i` above the loop; drop the `test` and you need an inner `break` to escape; drop the `step` and you advance `i` yourself. Strip all three and you're left with `for (;;) { … }` — the canonical C infinite loop, equivalent to `while (1)`.

### `break`, and where the loop variable lives `[13:25 → 14:44]`

C99 lets you declare the counter inside the header: `for (int i = 0; i < 10; i++)`. Cleaner, but `i` then **doesn't exist after the loop** — print it on the next line and you get a compile error. When you need to inspect the index *after* the loop (e.g. to tell whether a search hit or ran off the end of the array), declare `i` outside.

### `switch` is a jump table, not a chain of `if`s `[20:35 → 24:49]`

`switch (expr)` dispatches on an integer (or `char`, or `enum`). Each `case LABEL:` is literally a label — like a `goto` target — and the compiler may lower the whole construct to a *jump table* for speed. Two consequences:

- **Fall-through is the default.** Without `break`, execution keeps running into the next `case`. Sometimes you want that (grouping cases); usually it's a bug.
- **You can't declare a variable straight under `case`.** Wrap the body in `{ … }` first — blocks can appear anywhere in C.

`default:` runs when no `case` matches; it's the `else` of the `switch`.

## A tiny `switch` over a digit

```c:run
#include <stdio.h>

int main(void) {
    int n = 5;

    switch (n) {
    case 1:
    case 2:
    case 3:
        printf("small\n");
        break;
    case 5:
        printf("it's a 5\n");
        /* no break -> falls through */
    case 7:
        printf("it's a 7\n");
        break;
    default:
        printf("some other number\n");
        break;
    }
    return 0;
}
```

```output
it's a 5
it's a 7
```

Two things to notice. `case 1:` and `case 2:` fall through to `case 3:` *on purpose* — that's the idiomatic way to group values. Then `case 5:` falls through to `case 7:` *by accident*, because the `break` is missing — exactly the bug Salvatore demonstrates in the video. Change `n` to `2` to see the grouped path, or to `10` to hit `default`.

## The same loop, written both ways

```c:run
#include <stdio.h>

int main(void) {
    /* while form */
    int i = 0;
    while (i < 5) {
        printf("%d ", i);
        i++;
    }
    printf("\n");

    /* for form -- identical behaviour */
    for (int j = 0; j < 5; j++) {
        printf("%d ", j);
    }
    printf("\n");
    return 0;
}
```

```output
0 1 2 3 4 
0 1 2 3 4 
```

The two loops emit the same bytes. The `for` just hoists the init and step into the header so the body stays focused on the work.

## Try it

1. In the `switch`, add `break;` after the `case 5:` body and re-run. Output collapses to one line.
2. In the loop demo, replace `int j = 0` with `j = 0` and declare `int j;` above — the program still works, and `j` is now visible after the `for`. Print it.
3. Rewrite the `for` loop as `for (;;) { if (j >= 5) break; printf("%d ", j); j++; }` and confirm the output is unchanged.

## Cross-reference to K&R

See [K&R § 3.4 — Switch](../../kr/lessons/03-04-switch.md) and [K&R § 3.5 — Loops While and For](../../kr/lessons/03-05-loops-while-and-for.md). K&R presents the constructs formally and uses a `getchar`-driven digit counter as the canonical `switch` example. Salvatore's contribution is the *intuition*: `for` is mechanically rewritable into `while`, and `switch` is a labelled jump rather than a chain of comparisons.

## Go deeper

- Duff's device — the most notorious legal use of `switch` fall-through: <https://en.wikipedia.org/wiki/Duff%27s_device>.
- Compiler Explorer (<https://godbolt.org>): paste a `switch` with dense integer cases and watch GCC emit a jump table; make the cases sparse and watch it fall back to comparisons.
- GCC's `-Wimplicit-fallthrough` warning, and the `[[fallthrough]]` attribute (C23) for marking intentional fall-through.

*Click **next →** for Conway's Game of Life — our first non-trivial program built from loops and conditionals.*
