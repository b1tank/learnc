---
id: 05-11-pointers-to-functions
chapter: 5
label: "5.11"
title: Pointers to Functions
prev: ex-5-13
next: ex-5-14
status: done
---

Functions, like data, live at addresses in memory - in the program's executable `.text` segment. So you can take a **pointer to a function** and call *through* it, choosing at run time which function to invoke. This turns behavior into data: you can store functions in arrays, pass them as arguments (callbacks), and build dispatch tables. It's how `qsort` accepts your comparison function, how event loops invoke handlers, and how you replace a long `switch` with a clean indexed lookup.

## A dispatch table of function pointers

```c:run an array of function pointers
#include <stdio.h>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }

int main(void) {
    int (*ops[3])(int, int) = { add, sub, mul };   /* array of fn pointers */
    char *names[3]          = { "add", "sub", "mul" };

    for (int i = 0; i < 3; i++)
        printf("%s(6,2) = %d\n", names[i], ops[i](6, 2));
    return 0;
}
```

```output
add(6,2) = 8
sub(6,2) = 4
mul(6,2) = 12
```

`int (*ops[3])(int, int)` declares an array of three pointers, each to a function taking `(int, int)` and returning `int`. The parentheses around `*ops[3]` are mandatory - without them, `int *ops[3](...)` would parse as something else entirely (see the next section on reading declarations). A function name used without `()` decays to its address, exactly like an array name, so `{ add, sub, mul }` stores the three function addresses. Then `ops[i](6, 2)` selects the i-th function pointer and *calls through it* - no `&` or explicit `*` needed; both `ops[i](6,2)` and `(*ops[i])(6,2)` work and mean the same thing. The loop dispatches to a different function each iteration purely by index.

## Callbacks and why this is powerful

The real payoff is **callbacks** - passing a function pointer *into* another function so the callee can call *back* into your code. The standard library's [`qsort`](https://en.cppreference.com/w/c/algorithm/qsort) is the canonical example: you give it your array plus a `int (*cmp)(const void *, const void *)` comparator, and `qsort` calls your `cmp` whenever it needs to compare two elements - so one generic sort works for any data and any ordering. This is C's version of polymorphism: the sorting *algorithm* is fixed, but the *comparison behavior* is supplied as data. Dispatch tables (like `ops` above) are the other big use - a state machine, a virtual-machine opcode loop, or a command interpreter indexes into an array of handlers instead of a giant `switch`, which is often faster and far easier to extend (add a row, not a case). The cost to keep in mind: an *indirect* call through a pointer can be slightly slower than a direct call and can defeat the compiler's inlining, but for anything but the hottest inner loops that's irrelevant next to the flexibility gained.

## Go deeper
- [Pointers to functions (C)](https://en.cppreference.com/w/c/language/pointer#Pointers_to_functions) - declaration and calling
- [`qsort`](https://en.cppreference.com/w/c/algorithm/qsort) - the classic callback API
- [Callback (programming)](https://en.wikipedia.org/wiki/Callback_(computer_programming)) - the general pattern
- [Branch table / dispatch table](https://en.wikipedia.org/wiki/Branch_table) - replacing `switch` with an array
