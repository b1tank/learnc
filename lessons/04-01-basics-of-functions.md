---
id: 04-01-basics-of-functions
chapter: 4
label: "4.1"
title: Basics of Functions
prev: 03-08-goto-and-labels
next: ex-4-1
status: done
---

A function packages a computation behind a name, a list of typed **parameters**, and a **return type**. Calling it is a precise machine ritual governed by the [calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions): the caller places argument values in registers/stack, executes a `call` instruction that pushes the return address, the callee runs in its own [stack frame](https://en.wikipedia.org/wiki/Call_stack), puts its result in a register, and `ret`s back. Functions are how C decomposes a program and how the linker stitches separately-compiled pieces together.

## Declare before you use

```c:run prototype, call, define
#include <stdio.h>

int gcd(int a, int b);          /* prototype: name, params, return type */

int main(void) {
    printf("gcd(48,36) = %d\n", gcd(48, 36));
    printf("gcd(17,5)  = %d\n", gcd(17, 5));
    return 0;
}

int gcd(int a, int b) {         /* definition can come later */
    while (b != 0) { int t = b; b = a % b; a = t; }   /* Euclid's algorithm */
    return a;
}
```

```output
gcd(48,36) = 12
gcd(17,5)  = 1
```

The compiler reads top to bottom in one pass, so before `main` calls `gcd` it must have seen a **prototype** — the declaration `int gcd(int, int);` that announces the function's signature. With it, the compiler type-checks every call (right number and types of arguments, correct use of the result). Define the function itself anywhere; the prototype is the contract `main` compiles against. This is why headers exist: they're collections of prototypes.

## Parameters, return, and `void`

Parameters are *local variables* initialized from the argument values — they're copies (see [Call by Value](lesson.html?id=01-08-arguments-call-by-value)), so writing to them doesn't touch the caller. `return expr;` ends the function and hands `expr` back, converted to the declared return type. A function that returns nothing is declared `void`; one that takes nothing is declared with `(void)` — writing empty `()` in C means "unspecified arguments," not "no arguments," a historical wart you avoid by always writing `(void)`.

Every program's entry point is the function `main`; the runtime startup code calls it and treats its `int` return as the process **exit status** (0 = success). A function should ideally do one well-named thing and return a value rather than rely on side effects — that's what makes code testable and composable.

## Go deeper
- [Functions (C)](https://en.cppreference.com/w/c/language/functions) — declarations, definitions, parameters
- [Function prototype](https://en.wikipedia.org/wiki/Function_prototype) — why declaring before use matters
- [Calling convention](https://en.wikipedia.org/wiki/Calling_convention) — how arguments and results actually move
- [Euclidean algorithm](https://en.wikipedia.org/wiki/Euclidean_algorithm) — the GCD method used above
