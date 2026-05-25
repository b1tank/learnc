---
id: 03-01-statements-and-blocks
chapter: 3
label: "3.1"
title: Statements and Blocks
prev: ex-2-10
next: 03-02-if-else
status: done
---

A **statement** is the unit C executes. Every expression followed by a semicolon is a statement: `x = 0;`, `printf("hi");`, even a bare `i++;`. The semicolon is part of the statement, not a separator.

A **block** (or compound statement) is a `{ ... }` group. Anywhere a statement is allowed, a block is allowed — and inside the block you may have more statements and even local declarations. Blocks have no semicolon after the closing brace.

```c:starter
#include <stdio.h>

int main(void) {
    int n = 5;

    /* a single statement after if */
    if (n > 0) printf("positive\n");

    /* a block of statements (the common case) */
    if (n > 0) {
        int squared = n * n;     /* declaration inside the block */
        printf("n = %d, n*n = %d\n", n, squared);
    }

    /* squared is gone here — its scope was just the block */
    return 0;
}
```

```output
positive
n = 5, n*n = 25
```

## Why blocks matter

1. **Multi-statement bodies.** `if`/`while`/`for` take a single statement. To run several, wrap them in a block. Habit: always use braces, even for one-line bodies. It eliminates a whole family of bugs (the famous Apple `goto fail` bug was a missing brace).
2. **Local scope.** A variable declared inside a block exists only until the matching `}`. Shorter lifetimes mean less mental tracking and easier reasoning.
3. **Initialisation.** Each entry into a block can re-initialise its local variables. That's especially nice in tight loops.

## The empty statement

A lone `;` is a valid statement (it does nothing). It's idiomatic at the end of a loop whose work happens entirely in the header:

```c
for (i = 0; s[i] != '\0'; ++i)
    ;
```

The `;` on its own line signals "the body is intentionally empty" — much clearer than putting the semicolon next to the `for(...)` line.

## Modern note

C99 lets you declare variables anywhere within a block, not just at the top. Use that to limit each variable's scope to the lines that actually need it. The compiler is happy; the reader is happier.

## Notes from the author

- Always-braces is one of those style rules that costs nothing and saves accidents. The "no braces for single-line body" style looks tidier but breeds bugs when you later add a second line and forget to wrap.
- The empty statement at the end of a loop is a tiny piece of style hygiene: put it on its own line, indented. A `for(...);` on one line reads like a typo even when it's intentional.
- Scope blocks aren't only for control flow. You can write `{ int tmp = a; a = b; b = tmp; }` to swap two variables without polluting the enclosing scope with `tmp`. Modern C compilers will inline this away.

*Click **next →** for `if`/`else`.*
