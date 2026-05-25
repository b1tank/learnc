---
id: 03-05-loops-while-and-for
chapter: 3
label: "3.5"
title: Loops — While and For
prev: ex-3-2
next: ex-3-3
status: done
---

C has three loop constructs: `while`, `for`, and `do`/`while`. The first two are top-tested (the condition is checked *before* each iteration); the third (next lesson) is bottom-tested.

## `while`

```c
while (expression)
    statement
```

If the expression is non-zero, the statement runs; then the expression is tested again. Loops until the expression is zero.

```c
while (*p != '\0') {
    putchar(*p);
    ++p;
}
```

## `for`

```c
for (init; condition; update)
    statement
```

Equivalent to:

```c
init;
while (condition) {
    statement
    update;
}
```

Three slots: an initialiser run *once* before the first test, a condition tested before each iteration, and an update run *after* each iteration's body. Any of the three can be empty.

```c:starter
#include <stdio.h>

int main(void) {
    /* identical loop, three styles */

    /* while */
    int i = 0;
    while (i < 5) {
        printf("%d ", i);
        ++i;
    }
    putchar('\n');

    /* for */
    for (int j = 0; j < 5; ++j)
        printf("%d ", j);
    putchar('\n');

    /* for with empty slots */
    int k = 0;
    for (;;) {              /* infinite loop */
        if (k >= 5) break;
        printf("%d ", k);
        ++k;
    }
    putchar('\n');

    return 0;
}
```

```output
0 1 2 3 4
0 1 2 3 4
0 1 2 3 4
```

## When to pick which

- **`for`** when the iteration variable and bounds are obvious upfront — array traversal, counted loops, generators.
- **`while`** when the termination condition isn't a simple counter — input-driven, search-until-found, fixpoint iteration.

Both compile to the same machine code; the choice is purely about readability.

## The comma operator

Inside `for` slots you can use commas to do multiple things:

```c
for (i = 0, j = strlen(s) - 1; i < j; ++i, --j) {
    char tmp = s[i]; s[i] = s[j]; s[j] = tmp;
}
```

The comma operator evaluates left then right, returning the right value. In a `for` header it lets you initialise or update two variables in lock-step.

## Modern note

C99 allows declaring the index in the `for` header itself:

```c
for (int i = 0; i < n; ++i) { ... }
```

That `i` exists only inside the loop. Use this form by default — it limits scope, reads cleanly, and matches modern style.

## Try it

1. Rewrite a `while` loop as a `for` loop and vice versa. Note that "empty slots" are how `for` becomes `while`.
2. Reverse a string in-place using the comma-operator pattern in the `for` header. The two-pointer swap converges in `O(n/2)` iterations.
3. Build a Fibonacci generator: `for (int a = 0, b = 1; a < 100; a += b, b = a - b) printf("%d ", a);`. Watch how `b = a - b` reuses the just-updated `a`.

## Notes from the author

- The "for is sugar for while" identity is worth keeping in your head. Once you internalise it, the strange-looking `for (;;)` (infinite loop) and `for (init;;update)` (no condition, controlled by `break`) make sense.
- C99 in-loop declaration is one of the language's quiet wins. Pre-C99 code is full of "loop variable declared 200 lines earlier and reused for three different loops" — a confusing scope situation. New code should never do that.
- The comma-operator trick in `for` headers is occasionally beautiful, more often opaque. Use it for tightly-coupled paired updates (two-pointer scans, parallel iteration). Anywhere else, separate statements read better.

*Click **next →** for `do`/`while`.*
