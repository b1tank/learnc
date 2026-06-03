---
id: 01-10-external-variables-and-scope
chapter: 1
label: "1.10"
title: External Variables and Scope
prev: ex-1-19
next: ex-1-20
status: done
---

So far every variable has been **automatic** — born when its function/block is entered, destroyed on exit, living on the [stack](https://en.wikipedia.org/wiki/Call_stack). An **external** (global) variable is different: it's defined outside any function, exists for the whole program run, and is reachable by name from any function that follows it. Where it lives is decided at link time, not run time — it sits in a fixed [data segment](https://en.wikipedia.org/wiki/Data_segment) of the executable, not on the stack.

## Globals live in `.data` / `.bss`, and start zeroed

An initialized global goes in the `.data` segment; an uninitialized one goes in `.bss` and the loader guarantees it starts at **zero** — unlike a stack variable, which holds garbage. Any function can read and write it without it being passed as an argument:

```c:run an external variable shared across functions
#include <stdio.h>

int counter;        /* uninitialized global -> .bss, starts at 0 */
int total = 100;    /* initialized global   -> .data */

void bump(void) { counter++; }   /* no parameter: it just sees the global */

int main(void) {
    printf("counter starts at %d\n", counter);   /* 0, guaranteed */
    bump(); bump(); bump();
    printf("after 3 bumps: counter=%d, total=%d\n", counter, total);
    return 0;
}
```

```output
counter starts at 0
after 3 bumps: counter=3, total=100
```

Globals are convenient but dangerous: any function can change them, so a bug anywhere can corrupt state everywhere. Prefer parameters and return values; reach for globals only for genuinely program-wide state.

## `static`: storage of a global, scope of a local

The keyword `static` inside a function gives a variable **static storage duration** (it lives in `.data`, persisting across calls) while keeping its **name visible only inside that function**. It's initialized exactly once. This is how a function keeps private memory between calls — the basis of counters, caches, and lazy initialization:

```c:run static keeps state between calls
#include <stdio.h>

int next_id(void) {
    static int id = 0;   /* initialized once; survives every call */
    return ++id;
}

int main(void) {
    int a = next_id();
    int b = next_id();
    int c = next_id();
    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

```output
1 2 3
```

(The calls are written on separate lines deliberately: the order in which C evaluates several function calls inside one `printf` is *unspecified*, so `printf("%d %d %d", next_id(), next_id(), next_id())` could print `3 2 1` on one compiler and `1 2 3` on another — a classic portability trap.)

Scope answers "what names are visible here?"; storage duration answers "how long does the object live?" — they're independent axes, and `static` is the keyword that splits them apart.

## Go deeper
- [Storage duration & linkage](https://en.cppreference.com/w/c/language/storage_duration) — automatic, static, and the `static`/`extern` keywords
- [Scope (C)](https://en.cppreference.com/w/c/language/scope) — block vs file scope
- [Data segment / `.bss`](https://en.wikipedia.org/wiki/.bss) — where globals are stored
- [Unsequenced & undefined behavior](https://en.cppreference.com/w/c/language/eval_order) — why argument evaluation order bites
