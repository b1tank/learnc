---
id: 04-03-external-variables
chapter: 4
label: "4.3"
title: External Variables
prev: ex-4-2
next: ex-4-3
status: done
---

A variable declared **outside any function** is *external* — it has file scope (visible from the declaration to the end of the file) and static storage duration (it lives for the entire run of the program).

When several functions need to share state — or several `.c` files do — externals are how K&R-style C does it.

## The running example: a stack-based calculator

K&R uses a Reverse Polish calculator as a running example for chapters 4 and beyond. It reads tokens like `5 3 + 2 *` and prints `16`. Two arrays form a stack, several helpers manipulate it.

```c:starter
#include <stdio.h>
#include <stdlib.h>

#define MAXVAL 100

/* external (file-scope) variables shared across functions */
int  sp = 0;            /* stack pointer */
double val[MAXVAL];     /* the stack itself */

void push(double f);
double pop(void);
void show_top(void);

int main(void) {
    push(2.0);
    push(3.0);
    push(pop() + pop());     /* 5.0 */
    push(4.0);
    push(pop() * pop());     /* 20.0 */
    show_top();
    return 0;
}

void push(double f) {
    if (sp < MAXVAL)
        val[sp++] = f;
    else
        fprintf(stderr, "stack full\n");
}

double pop(void) {
    if (sp > 0)
        return val[--sp];
    fprintf(stderr, "stack empty\n");
    return 0.0;
}

void show_top(void) {
    if (sp > 0)
        printf("top = %g (depth %d)\n", val[sp-1], sp);
    else
        printf("(stack empty)\n");
}
```

```output
top = 20 (depth 1)
```

`sp` and `val` are *declared* once at file scope (which both defines and gives them storage), and *used* directly by name in every function below.

## Declaration vs definition

There are two related concepts:

- **Definition** — `int sp = 0;` allocates storage and (optionally) initialises it.
- **Declaration** — `extern int sp;` tells the compiler "such a variable exists somewhere; don't allocate it here, just trust the type and resolve at link time".

Each external variable must be **defined exactly once across all `.c` files** in the program. It may be declared (`extern`) many times — typically once per `.c` file that uses it, conventionally inside a shared header.

## Multi-file usage

A typical layout:

```c
/* calc.h */
extern int sp;
extern double val[];        /* size omitted is fine for extern */
void push(double);
double pop(void);
```

```c
/* stack.c — defines them once */
#include "calc.h"
int sp = 0;
double val[MAXVAL];
/* ... push, pop ... */
```

```c
/* main.c — uses them */
#include "calc.h"
int main(void) { push(2.0); ... }
```

The header gets included by both `.c` files. Inside `stack.c` the *definitions* override the `extern` declaration; inside `main.c` only the declaration is seen, and the linker resolves the reference to `stack.c`'s storage.

## When NOT to use externals

Globals are easy to write and *hard to maintain*. They:

- Make function behaviour depend on hidden state (the caller can't tell from the signature).
- Break multithreading (anyone can race on a shared global).
- Defeat the unit-tester (no way to mock or reset cleanly).

Modern C practice: pass state explicitly via parameters, or hide it inside a `struct` whose pointer is passed around. The calculator example is fine for a teaching exercise; a real one would pass a `Calculator *` to every function.

## Modern note

`<stdatomic.h>` (C11) provides `atomic_int` etc. for thread-safe globals. Don't roll your own with `volatile` — `volatile` is for memory-mapped I/O, not synchronisation. If you have shared state across threads, use atomics or proper locking.

## Try it

1. Run the program with `MAXVAL` reduced to 2 and try to push 5 values. Confirm the overflow message fires.
2. Remove the `extern`-less definitions in main and move them under a new file. Build with `gcc main.c stack.c` and notice how each `.c` becomes one translation unit.
3. Refactor the calculator: replace the global `sp` and `val` with a `typedef struct { int sp; double val[MAXVAL]; } Stack;` passed to every function. Notice how the signatures get longer but every function becomes thread-safe and testable.

## Notes from the author

- "Global mutable state" is the universal anti-pattern. C makes it easy because the language predates module systems; modern C reins it in with `static` (next sections) and discipline.
- The "one definition rule" is the most common cause of "multiple definition" linker errors. The rule of thumb: in headers, only declare (`extern`); in one `.c` file per global, define.
- A surprising number of seasoned C programmers don't realise that `extern` is what makes a header file safe to include from many `.c` files. Without it, two `#include "header.h"` lines would define the same variable twice → linker error.

*Click **next →** for scope rules.*
