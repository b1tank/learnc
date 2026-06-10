---
id: 04-10-recursion
chapter: 4
label: "4.10"
title: Recursion
prev: 04-09-initialization
next: ex-4-12
status: done
---

A **recursive** function is one that calls itself. It works because every call gets its own fresh [stack frame](https://en.wikipedia.org/wiki/Call_stack) - its own copies of parameters and locals - so the in-progress calls don't clobber each other. Each call pushes a frame; each return pops one. Recursion suits problems that are naturally *self-similar*: factorial, tree traversal, divide-and-conquer. Two ingredients are mandatory: a **base case** that returns without recursing (or the stack grows forever and you hit [stack overflow](https://en.wikipedia.org/wiki/Stack_overflow)), and a **recursive step** that moves toward that base case.

## Two flavors of self-call

```c:run factorial and a countdown
#include <stdio.h>

long fact(int n) {
    if (n <= 1) return 1;           /* base case: stop recursing */
    return n * fact(n - 1);         /* recursive step: shrink n */
}

void countdown(int n) {
    if (n == 0) { printf("liftoff\n"); return; }   /* base case */
    printf("%d ", n);
    countdown(n - 1);               /* tail call: nothing happens after it */
}

int main(void) {
    printf("5! = %ld\n", fact(5));
    countdown(3);
    return 0;
}
```

```output
5! = 120
3 2 1 liftoff
```

Trace `fact(5)`: it suspends waiting on `fact(4)`, which waits on `fact(3)`, down to `fact(1)` which returns 1 - then the stack *unwinds*, each frame multiplying its `n` on the way out: `1→2→6→24→120`. Five frames were live at the deepest point, each holding its own `n`. `countdown` is a **tail-recursive** function: the recursive call is the very last thing it does, so there's no pending work to return to.

## What it costs, and the iteration trade-off

Recursion isn't free: every call consumes a stack frame, and the stack is finite (often a few MB). Recurse a million deep on `fact` and you'll overflow the stack and crash - whereas an iterative `for` loop computing the same factorial uses **one** frame and no such limit. So anything *naturally* iterative (summing an array, a simple counter) should be a loop; reach for recursion when the problem itself is recursive and the code is dramatically clearer (parsing, trees, graph search). For tail-recursive functions like `countdown`, optimizing compilers can perform **tail-call optimization** - reusing the single frame instead of stacking new ones - turning the recursion into a loop under the hood at `-O2`. Even so, C doesn't *guarantee* TCO, so don't rely on it for unbounded depth.

## Go deeper
- [Recursion (computer science)](https://en.wikipedia.org/wiki/Recursion_(computer_science)) - base case, recursive step
- [Call stack](https://en.wikipedia.org/wiki/Call_stack) - the frames that make it work
- [Tail call](https://en.wikipedia.org/wiki/Tail_call) - when recursion costs no extra frame
- [Stack overflow](https://en.wikipedia.org/wiki/Stack_overflow) - what unbounded recursion hits
