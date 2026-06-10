---
id: 03-02-if-else
chapter: 3
label: "3.2"
title: If-Else
prev: 03-01-statements-and-blocks
next: 03-03-else-if
status: done
---

`if (expr) stmt` runs `stmt` only when `expr` is **nonzero** - remember, C has no separate boolean; any nonzero value is "true." An optional `else` gives the alternative. At the machine level this is a *conditional branch*: the compiler evaluates the expression into a flag and jumps over the body when it's false. Everything about C's control flow is built on this one primitive.

## Truthiness, and the dangling-else rule

```c:run if/else basics
#include <stdio.h>

int main(void) {
    for (int n = -2; n <= 2; n++) {
        if (n > 0)
            printf("%2d: positive\n", n);
        else if (n < 0)
            printf("%2d: negative\n", n);
        else
            printf("%2d: zero\n", n);
    }
    int flags = 4;
    if (flags)                       /* nonzero == true; no "!= 0" needed */
        printf("flags is set (%d)\n", flags);
    return 0;
}
```

```output
-2: negative
-1: negative
 0: zero
 1: positive
 2: positive
flags is set (4)
```

The `else if` chain is read top to bottom; the first true branch wins and the rest are skipped. The last `if (flags)` shows truthiness directly - `flags` is `4`, which is nonzero, so the body runs without any explicit `!= 0`.

## The two classic traps

**`=` vs `==`.** `if (x = 5)` assigns 5 to `x` and tests 5 (always true); `if (x == 5)` compares. The compiler usually warns, but the bug compiles. Some people write the constant on the left (`if (5 == x)`) so a slipped `=` becomes an error.

**Dangling else.** An `else` always binds to the *nearest* unmatched `if`, regardless of indentation:

```c
if (a)
    if (b) foo();
    else   bar();   /* this else belongs to `if (b)`, NOT `if (a)` */
```

If you meant it to pair with `if (a)`, you must add braces: `if (a) { if (b) foo(); } else bar();`. This is exactly why the disciplined style is to **always brace** the bodies of `if`/`else`, even one-liners - it makes the grouping explicit and immune to later edits.

## Go deeper
- [`if` statement (C)](https://en.cppreference.com/w/c/language/if) - syntax and semantics
- [Dangling else](https://en.wikipedia.org/wiki/Dangling_else) - the classic grammar ambiguity
- [Conditional branch](https://en.wikipedia.org/wiki/Branch_(computer_science)) - what `if` becomes in machine code
