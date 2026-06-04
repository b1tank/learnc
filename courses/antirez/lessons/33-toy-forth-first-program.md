---
id: 33-toy-forth-first-program
chapter: 9
label: "9.9"
title: Toy Forth — running the first program
prev: 32-variadic-functions
next: 34-zx-spectrum-image-1
status: draft
source:
  videoId: nHzlRqPnlrE
  url: https://www.youtube.com/watch?v=nHzlRqPnlrE
---

> **Source video.** [Let's Learn C — lesson 29](https://www.youtube.com/watch?v=nHzlRqPnlrE) by Salvatore Sanfilippo (antirez).

## TL;DR

The pieces from parts 1–5 finally compose into a working pipeline: parse a `.txt` file into tokens, push integers, dispatch `+` to a C callback, leave the result on top of the stack. The day's work is plumbing — a `Makefile`, a Git repo, a unified `TF_OK / TF_ERR` return convention, and a typed `listPopType` — but it ends with `toyforth toy_test.txt` printing **stack content at end: 21** for the program `2 10 + 1 +`.

## Walkthrough

### Project hygiene before the cliff `[01:06 → 11:52]`

At 428 lines, `toyforth.c` is past the "single file, recompile from memory" stage. A two-target `Makefile` (`all: toyforth`, plus `clean`) drops `cc … -O2 -Wall …` into one keystroke and uses mtime so `make` is a no-op when nothing changed. `git init` + a `.gitignore` for the binary lets `git reset --hard` undo a broken experiment in one command. Tiny rituals, big effect on iteration speed.

### One return convention: `TF_OK` / `TF_ERR` `[12:24 → 18:04]`

Mixed `0`-means-success and `1`-means-success across functions is a bug factory. Two `#define`s — `TF_OK 0`, `TF_ERR 1` — let every interpreter routine return the same enum-shaped int. The C callback prototype is changed to take `char *name` instead of a `TFObject*` for the name: the dispatcher already knows the symbol, there's no reason to wrap it.

### `listPopType` and the `TYPE_ALL` trick `[22:42 → 33:00]`

`contextStackPop` was about to grow type-checking logic that really belongs to the list, so it gets pushed down. `listPopType(list, type)` returns NULL on empty, NULL on type mismatch, otherwise pops and **transfers ownership to the caller** (refcount unchanged). To get a plain "pop anything" back, define `TF_OBJ_TYPE_ALL = 255` and write `listPop` as a one-liner wrapper. `contextStackPop` becomes a thin shim — the interpreter stays decoupled from list internals.

### The first runnable program — and the leak Claude caught `[37:30 → 44:13]`

`echo "2 10 + 1 +" > toy_test.txt && ./toyforth toy_test.txt` prints `stack content at end: 21`. The interpreter *runs*. Pasting the file into Claude Opus for review immediately catches a refcount bug in `basicMathFunction`: the operands `a` and `b` were popped (ownership now with the callee) but never `release`d after the result was pushed — a leak on every arithmetic op. Worse: on a *type mismatch* the first pop succeeded and the second returned NULL, leaving the stack visibly shorter than the caller saw it. The fix is to `contextStackPush(ctx, a)` before returning `TF_ERR`, so a failed operation leaves the stack byte-for-byte unchanged. Salvatore: *"I now consider it a moral imperative for programmers to do code reviews with AIs."*

### The cleaner design, deferred `[44:13 → 45:34]`

The rollback dance is a smell. Next lesson swaps the typed pop for a variadic precheck — `contextCheckTypes(ctx, TF_OBJ_TYPE_INT, TF_OBJ_TYPE_INT, -1)` — that inspects the top of the stack *before* anything is popped. No partial state, no push-back, no apologies.

## A 25-line Toy-Forth-in-miniature

Tokenize `"2 3 +"`, push integers, fold with a `+` op, print the result. Same shape as `exec()`, minus reference counting and error plumbing.

```c:run
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static long stk[32];
static int  sp = 0;
static void push(long v) { stk[sp++] = v; }
static long pop(void)    { return stk[--sp]; }

static void exec_word(const char *tok) {
    if (tok[0] == '+' && tok[1] == 0) {
        long b = pop(), a = pop();
        push(a + b);
    } else {
        push(strtol(tok, NULL, 10));
    }
}

int main(void) {
    char program[] = "2 3 +";
    for (char *t = strtok(program, " "); t; t = strtok(NULL, " "))
        exec_word(t);
    printf("%ld\n", pop());
    return 0;
}
```

```output
5
```

Trace the stack as the loop runs: `[2] → [2, 3] → [5]`. `+` is the only dispatch case here; the real interpreter does the same thing but indexes a function table by name and routes user-defined words to `exec()` recursively.

## Try it

1. Extend `exec_word` to handle `-` and `*`; verify `5 3 -` prints `2` and `4 6 *` prints `24`.
2. Trace the stack by hand for `5 3 + 2 *` before running — predict the output, then add it as the program.
3. Add a check at the top of `exec_word`'s `+` branch: if `sp < 2`, print `stack underflow` and `return` without popping. This is the mini-version of `contextCheckStackMinLen`.

## Cross-reference to K&R

[K&R § 4.3 — External Variables](../../kr/lessons/04-03-external-variables.md) is the textbook match: K&R build a Polish-notation calculator with `push` / `pop` over a fixed-size `double` stack and a `getop` tokeniser. Toy Forth is the same skeleton scaled up — typed objects instead of raw doubles, a dictionary of named words instead of a switch on tokens, and reference counting so values can flow through the stack without leaking.

## Go deeper

- Real Forth implementations (gforth, pforth) compile each word to a *threaded* sequence of word addresses rather than re-parsing tokens — orders of magnitude faster, same conceptual model.
- The "stack must be unchanged on failure" invariant is the same one that makes database transactions and STM possible: every operation is atomic from the caller's point of view, and partial state is invisible.
- LLM-assisted self-review on a working-but-unfinished file is a free safety net. The bug Claude flagged here — leaked refcounts on the success path, observable stack drift on the error path — is exactly the class of mistake a tired human re-reading their own code stops seeing.

*Click **next →** for a short detour: rendering a ZX Spectrum screen image in C.*
