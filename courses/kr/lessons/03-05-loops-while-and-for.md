---
id: 03-05-loops-while-and-for
chapter: 3
label: "3.5"
title: Loops - While and For
prev: ex-3-2
next: ex-3-3
status: done
---

A loop is just a conditional branch that jumps *backward*. `while (expr) stmt` tests `expr`; if nonzero it runs `stmt` and tests again - a top-tested loop, so the body may run zero times. `for (init; cond; step) stmt` is exactly the same loop with its three moving parts gathered in one place: run `init` once, then repeat "test `cond` → body → `step`." Anything you can write with `for` you can write with `while` and vice-versa; `for` just keeps the loop's bookkeeping visible.

## The two forms, side by side

```c:run while and for are the same loop
#include <stdio.h>

int main(void) {
    int sum = 0, i = 1;
    while (i <= 5) { sum += i; i++; }        /* manual init/test/step */
    printf("while sum 1..5 = %d\n", sum);

    long fact = 1;
    for (int n = 1; n <= 6; n++)             /* the three parts collected */
        fact *= n;
    printf("for 6! = %ld\n", fact);

    for (int p = 1; p <= 16; p *= 2)         /* the step can be anything */
        printf("%d ", p);
    printf("\n");
    return 0;
}
```

```output
while sum 1..5 = 15
for 6! = 720
1 2 4 8 16 
```

Prefer `for` when the loop has a clear counter and a fixed step - the header documents the whole loop at a glance, and the index variable can be scoped to the loop (`for (int n = ...)`). Prefer `while` when continuation depends on something computed in the body, like `while ((c = getchar()) != EOF)`. The `p *= 2` example shows the step is an arbitrary expression, not just `++`.

## Off-by-one and the empty loop

The number-one loop bug is the **fence-post / off-by-one** error: `<` vs `<=`. `for (i = 0; i < n; i++)` runs exactly `n` times over indices `0..n-1` - the canonical form for an array of length `n`. Using `<=` there would touch `a[n]`, one past the end. Internalize "start at 0, test with `<`, length n" and most index bugs disappear.

All three `for` clauses are optional. `for (;;)` is an idiomatic infinite loop (no condition means "always true"), exited with `break` or `return`. A loop that does all its work in the header has an *empty body*, written as a lone semicolon - `while ((c = getchar()) != ' ') ;` - where the `;` must be obvious so nobody thinks the next line is the body.

## Go deeper
- [`while` loop (C)](https://en.cppreference.com/w/c/language/while) - the basic top-tested loop
- [`for` loop (C)](https://en.cppreference.com/w/c/language/for) - the three clauses and their scope
- [Off-by-one error](https://en.wikipedia.org/wiki/Off-by-one_error) - why `<` vs `<=` matters
- [Loop optimization](https://en.wikipedia.org/wiki/Loop_optimization) - what compilers do with your loops
