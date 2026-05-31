---
id: 03-03-else-if
chapter: 3
label: "3.3"
title: Else-If
prev: 03-02-if-else
next: ex-3-1
status: done
---

There is no `elif` keyword in C. The `else if` "ladder" is just nested `if/else` with the formatting flattened — `else` whose statement happens to be another `if`. It's the idiomatic way to pick one path out of several mutually-exclusive ranges. The tests run **top to bottom**; the first true one fires, its body executes, and every remaining test is skipped. A trailing bare `else` catches "none of the above."

## A range classifier

```c:run an else-if ladder
#include <stdio.h>

const char *grade(int s) {
    if      (s >= 90) return "A";
    else if (s >= 80) return "B";
    else if (s >= 70) return "C";
    else              return "F";   /* the catch-all */
}

int main(void) {
    int marks[] = {95, 83, 72, 40};
    for (int i = 0; i < 4; i++)
        printf("%d -> %s\n", marks[i], grade(marks[i]));
    return 0;
}
```

```output
95 -> A
83 -> B
72 -> C
40 -> F
```

Order is everything. Because the first match wins, the tests must go from most to least specific (or, as here, highest threshold first). If you wrote `s >= 70` before `s >= 90`, a 95 would match the `>= 70` branch and wrongly score a "C" — the later, stronger test never gets a chance. The `early return` from each branch is a clean alternative to deeply nested braces.

## When to switch to `switch`

An `else if` ladder evaluates each condition in sequence — O(n) comparisons for n branches — and handles *arbitrary* expressions (ranges, function calls, combined conditions). When you're instead dispatching on the *exact value* of a single integer or character, a [`switch`](lesson.html?id=03-04-switch) is clearer and the compiler may compile it to a jump table (O(1) dispatch). Rule of thumb: ranges and compound tests → `else if`; equality against many discrete constants → `switch`.

## Go deeper
- [`if`/`else if` (C)](https://en.cppreference.com/w/c/language/if) — the ladder is just nested `if`
- [Guard clause / early return](https://en.wikipedia.org/wiki/Guard_(computer_science)) — flattening nesting with returns
- [Branch table](https://en.wikipedia.org/wiki/Branch_table) — how `switch` can beat a long ladder
