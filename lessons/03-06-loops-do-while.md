---
id: 03-06-loops-do-while
chapter: 3
label: "3.6"
title: Loops — Do-While
prev: ex-3-3
next: ex-3-4
status: done
---

`while` and `for` test *before* the body, so they can run zero times. `do { ... } while (expr);` flips that: it runs the body **first**, then tests, so the body always executes **at least once**. It's the bottom-tested loop — a backward branch placed *after* the body instead of before. Use it exactly when "do the thing, then decide whether to repeat" is the natural shape: prompting for input, retrying an operation, or any algorithm that must produce at least one result.

## Run-then-test

```c:run do-while runs at least once
#include <stdio.h>

int main(void) {
    int n = 0;
    do {
        printf("body runs, n=%d\n", n);
        n++;
    } while (n < 3);

    /* reverse a number's digits — must emit a digit even for input 0 */
    int x = 123, rev = 0;
    do {
        rev = rev * 10 + x % 10;   /* peel the last digit, append to rev */
        x /= 10;
    } while (x > 0);
    printf("reversed = %d\n", rev);
    return 0;
}
```

```output
body runs, n=0
body runs, n=1
body runs, n=2
reversed = 321
```

The digit-reversal is the textbook case for `do-while`. With a plain `while (x > 0)`, an input of `0` would produce *no* output (the test fails immediately). `do-while` guarantees the loop emits at least one digit, so reversing `0` correctly yields `0`. Whenever "even the empty/zero case needs one pass" is true, `do-while` is the precise tool.

## Use it sparingly

`do-while` is the least-used of the three loops because most loops genuinely *should* be able to run zero times — processing a list that might be empty, scanning input that might be at EOF. Reaching for `do-while` when the body shouldn't run on empty input is a classic bug. And note the mandatory **semicolon** after `while (expr)` — it terminates the statement; leaving it off is a common compile error. When the "at least once" guarantee is real, `do-while` expresses it clearly; otherwise prefer `while`/`for`.

## Go deeper
- [`do-while` loop (C)](https://en.cppreference.com/w/c/language/do) — syntax and the trailing semicolon
- [Control flow loops](https://en.wikipedia.org/wiki/Control_flow#Loops) — pre-test vs post-test loops compared
