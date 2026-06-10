---
id: 29-toy-forth-exec-internals
chapter: 9
label: "9.5"
title: Toy Forth - inside exec() (part 4)
prev: 28-toy-forth-part-3
next: 30-toy-forth-function-registration
status: draft
source:
  videoId: oMj3N6jYIUU
  url: https://www.youtube.com/watch?v=oMj3N6jYIUU
---

> **Source video.** [Let's Learn C - lesson 26](https://www.youtube.com/watch?v=oMj3N6jYIUU) by Salvatore Sanfilippo (antirez).

## TL;DR

The executor is a loop. A compiled program is a sequence of *words*; `exec` walks them one by one and decides for each: if the word is a **symbol**, look it up in a function table and call the bound callback; otherwise, push the literal onto the stack. That's it - every other piece of the interpreter (numbers, strings, `dup`, `+`, user-defined functions via `def`) is built on top of this two-line decision.

## `exec`'s contract `[05:42]`

`void exec(tfctx *ctx, tfobj *prg)` opens with `assert(prg->type == TFOBJ_TYPE_LIST)`. Programs *are* lists in this language, so a non-list argument is a bug, not a runtime error. Then a `for` loop visits each element - a *word* in Forth's vocabulary.

## Seeing `assert` fire `[06:32 → 07:50]`

To show what the guard does when it's violated, Salvatore drops a deliberately false assertion into `main`:

```c
assert(1 == 2);
```

Compiling and running aborts immediately, naming the failed condition, the function, and the source line:

```
./a.out program.tf
```

```output
Assertion failed: (1 == 2), function main, file toyforth.c, line 220.
Abort trap: 6
```

A false `assert` calls `abort()` and never returns, so a violated invariant stops the program right there instead of letting it corrupt state downstream.

## Dispatch per word `[07:50 → 15:08]`

Inside the loop, `switch(word->type)` has exactly two interesting branches: `TFOBJ_TYPE_SYMBOL` calls into the executor's lookup machinery; `default` pushes the literal onto `ctx->stack`. Numbers, booleans, strings - all the same code path. Only symbols cause work.

## Literals pile up; symbols do nothing - yet `[16:07 → 17:41]`

With the `TFOBJ_TYPE_SYMBOL` branch still empty, only `default` does anything. Adding a temporary `printObject(ctx->stack)` after `exec` and running a real program shows the two numbers landing on the stack while every symbol is silently ignored:

```
./a.out program.tf
```

```output
Stack content at end:
[5 10]
```

`5` and `10` were pushed; `plus`, `dup`, `*`, and `print` are symbols, and until the function table is wired up they evaluate to nothing. The very next step gives that empty branch its job: `callSymbol`.

## Pushing keeps things alive `[24:53 → 25:48]`

`listPush` does not bump the refcount; the *caller* must. When `exec` pushes a literal onto the stack, the word is still part of the program list - two owners now, so `retain(word)` before `listPush`. This is the moment reference counting starts to pay off: a `release` later from either side leaves the object alive for the other.

## `callSymbol` and the function table `[17:41 → 19:52]`

`int callSymbol(tfctx *ctx, tfobj *word)` scans `ctx->functable.func_table` linearly, comparing symbol names. Hit → invoke the callback with `(ctx, word)` and return 0. Miss → return 1 so the caller can produce a runtime error. The table itself is a `struct FunctionTableEntry` with three fields: the symbol that names it, a C `callback` pointer, and a `tfobj *user_list` that is `NULL` for built-ins and a Toy Forth program for words defined with `def`.

## One callback, many names `[37:01 → 37:58]`

The callback receives both the context *and* the symbol that triggered it. That means a single function can implement `+`, `-`, `*`, `/` - share the "pop two ints" preamble, switch on the name for the operation. The function table becomes a routing layer, not a per-word implementation.

## A miniature `exec` loop

The real interpreter dispatches on a runtime symbol table; here is the same shape with the table compiled in. Each `Word` is a function pointer plus an immediate argument; the loop is six lines.

```c:run
#include <stdio.h>

static int stack[64];
static int sp = 0;

typedef void (*op_t)(int arg);

static void op_push(int a)  { stack[sp++] = a; }
static void op_add(int _)   { (void)_; int b = stack[--sp], a = stack[--sp]; stack[sp++] = a + b; }
static void op_print(int _) { (void)_; printf("%d\n", stack[--sp]); }

typedef struct { op_t fn; int arg; } Word;

static void exec(const Word *prog, int n) {
    for (int i = 0; i < n; i++) prog[i].fn(prog[i].arg);
}

int main(void) {
    Word program[] = {
        { op_push, 2 },
        { op_push, 3 },
        { op_add,  0 },
        { op_print, 0 },
    };
    exec(program, sizeof program / sizeof program[0]);
    return 0;
}
```

```output
5
```

The dispatch cost is one indirect call per word - exactly what `callSymbol`'s callback invocation will do once the symbol-to-function lookup is in place.
