---
id: 02-06-relational-and-logical-operators
chapter: 2
label: "2.6"
title: Relational and Logical Operators
prev: 02-05-arithmetic-operators
next: 02-07-type-conversions
status: done
---

C distinguishes **relational** operators (compare values) from **logical** operators (combine truthy values). Both produce **`int` results**, either 0 (false) or 1 (true). There's no separate `bool` type in K&R-era C.

## Relational operators

`<`, `<=`, `>`, `>=` for ordering; `==` and `!=` for equality. Lower precedence than arithmetic, so `a + 1 < b` parses as `(a + 1) < b`. The two equality operators sit at lower precedence than the four ordering operators (so `a < b == c < d` is `(a < b) == (c < d)`).

## Logical operators

- `&&` — logical AND, short-circuits: if the left side is false, the right side is **not evaluated**.
- `||` — logical OR, short-circuits: if the left side is true, the right side is **not evaluated**.
- `!` — logical NOT, unary.

Short-circuit evaluation isn't a performance optimisation — it's a **language guarantee** you can program against:

```c
if (p != NULL && *p == 'x') { ... }   /* safe: *p only happens if p valid */
if (i < n && arr[i] > 0)    { ... }   /* safe: out-of-bounds avoided */
```

```c:starter
#include <stdio.h>

int main(void) {
    int a = 3, b = 7;

    printf("a < b           = %d\n", a < b);          /* 1 */
    printf("a == b          = %d\n", a == b);         /* 0 */
    printf("a != b          = %d\n", a != b);         /* 1 */

    printf("(a < b) && (b < 10) = %d\n", (a < b) && (b < 10));   /* 1 */
    printf("(a > b) || (b < 0)  = %d\n", (a > b) || (b < 0));    /* 0 */
    printf("!(a == b)            = %d\n", !(a == b));            /* 1 */

    /* short-circuit demo */
    int divisor = 0;
    if (divisor != 0 && 100 / divisor > 0)
        printf("not reached\n");
    else
        printf("divisor was zero — the division was skipped\n");

    return 0;
}
```

```output
a < b           = 1
a == b          = 0
a != b          = 1
(a < b) && (b < 10) = 1
(a > b) || (b < 0)  = 0
!(a == b)            = 1
divisor was zero — the division was skipped
```

## "Truthy" in C

Any **non-zero** value is treated as true in an `if`/`while`/`for` condition; zero is false. The idiom `while (*p)` works because the loop ends at the `'\0'` byte (which equals zero).

The two-fold meaning of `int` here — "an integer value" and "a boolean condition" — is one of C's idiosyncrasies and the source of a famous family of bugs.

## The `=` vs `==` mistake

```c
if (x = 0) ...   /* compiles. Assigns 0 to x, then tests it (always false). */
if (x == 0) ...  /* correct: tests equality */
```

This is the single most-reported beginner C bug. Modern compilers (`-Wall`) warn when assignment is used in a condition without an extra pair of parens. Adopt the habit of writing `if (0 == x)` ("Yoda comparison") if it helps you spot accidents — though most professional code just uses `-Werror` and moves on.

## Modern note

C99 introduced `<stdbool.h>`, which gives you `bool`, `true`, and `false`. They're typedefs/macros over `_Bool` and `1`/`0`. Use them in new code for clarity — they document intent.

```c
#include <stdbool.h>
bool found = false;
if (found) { ... }
```

## Try it

1. Compute `1 < 2 < 3`. This parses as `(1 < 2) < 3` → `1 < 3` → `1` — *not* "is 2 between 1 and 3". You almost always want `1 < x && x < 3`.
2. Inside a condition, write `a = 5` (single equals). Note what happens. Now add `-Wall -Werror` and see the compiler refuse.
3. Test short-circuit with a function that prints when called: `if (false && noisy()) {}`. `noisy()` does not run.

## Notes from the author

- The "no bool, just int" design is K&R minimalism — fewer types is fewer things to learn. C99's `_Bool` was added because static analysers needed a way to distinguish "this int is a flag" from "this int is a number." Use `bool` (the macro) in your code; it's free documentation.
- The `&&` and `||` short-circuit guarantees are *behavioural*, not just "we usually do this." You can rely on them for safety: NULL-pointer guards, range checks, lazy evaluation patterns.
- The bitwise `&`/`|` operators look similar but do **not** short-circuit, and they operate on every bit. Mixing `&` and `&&` is another classic beginner bug.

*Click **next →** to study type conversion rules.*
