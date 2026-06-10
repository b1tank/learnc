---
id: 03-07-break-and-continue
chapter: 3
label: "3.7"
title: Break and Continue
prev: ex-3-6
next: 03-08-goto-and-labels
status: done
---

`break` and `continue` are structured escape hatches inside loops. `break` jumps **out** of the innermost enclosing loop (or `switch`) entirely - the loop is done. `continue` jumps to the **next iteration**, skipping the rest of the body but *not* leaving the loop (in a `for`, it still runs the step clause). Both are restricted, well-behaved `goto`s: they can only jump forward to one fixed place, so they keep code readable while avoiding awkward flag variables.

## Skip with `continue`, stop with `break`

```c:run continue skips, break stops
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 10; i++) {
        if (i % 2 == 0) continue;   /* even: skip to next iteration */
        if (i > 7)      break;      /* past 7: leave the loop for good */
        printf("%d ", i);
    }
    printf("\n");
    return 0;
}
```

```output
1 3 5 7 
```

Trace it: `i = 1,3,5,7` print; the even values are skipped by `continue`; at `i = 9` the `i > 7` test fires `break` and the loop ends. (Even values never reach the `break` test because `continue` jumped past it.) This reads far cleaner than nesting the body inside `if (i % 2 != 0 && i <= 7)` - guard-and-skip flattens the logic.

## The one-level limit

`break` only escapes **one** loop level. In nested loops, `break` in the inner loop returns you to the outer loop, which keeps going - it does *not* break all the way out. C has no labeled `break` (unlike Java). To abandon nested loops at once you have three options: a `goto` to a label just past the loops (the cleanest - see [Goto and Labels](lesson.html?id=03-08-goto-and-labels)), a `done` flag tested by every loop, or factoring the loops into a function and using `return`. Overusing `continue`/`break` can obscure a loop's logic; used for genuine "skip this" and "we're done" cases, they're idiomatic and clear.

## Go deeper
- [`break` statement (C)](https://en.cppreference.com/w/c/language/break) - what it exits
- [`continue` statement (C)](https://en.cppreference.com/w/c/language/continue) - and how it interacts with `for`'s step
- [Structured programming](https://en.wikipedia.org/wiki/Structured_programming) - why limited jumps are preferred over raw `goto`
