---
id: 04-02-functions-returning-non-integers
chapter: 4
label: "4.2"
title: Functions Returning Non-integers
prev: ex-4-1
next: ex-4-2
status: done
---

Historically, if you called a function C hadn't seen declared, it *assumed* the function returned `int`. For a function that actually returns `double` (or a pointer), that assumption is catastrophic: the caller reads the result from the wrong register, in the wrong format, and gets garbage. The fix — and a hard rule in modern C — is to **declare every function before you call it**, with its true return type. C99 removed the "implicit int" rule entirely; today calling an undeclared function is an error.

## The prototype carries the return type

```c:run a function that returns double
#include <stdio.h>

double favg(double a, double b) {   /* its definition (and prototype) precede main */
    return (a + b) / 2.0;
}

int main(void) {
    printf("avg = %.2f\n", favg(3.0, 4.0));
    return 0;
}
```

```output
avg = 3.50
```

Because the compiler has seen `favg`'s real signature before the call, it knows the result is a `double` arriving in a floating-point register and passes it to `printf` correctly. Remove the declaration (in old C) and the compiler would assume `int`, fetch from an integer register, and print nonsense — a bug that historically bit people who forgot to `#include <math.h>` before calling `sqrt`.

## Why this was such a famous trap

The lesson generalizes: **the prototype must be in scope at the call site**, and it must match the definition exactly. A mismatch between what the caller assumes and what the callee actually does — return type *or* parameter types — is undefined behavior. This is the entire reason library headers exist: `<math.h>` declares `double sqrt(double)`, `<stdlib.h>` declares `void *malloc(size_t)`, so the moment you `#include` them every call is type-checked. Forget the include and, pre-C99, the compiler silently assumed `int sqrt(int)` and your math quietly broke. Always include the right header (or write your own prototype) for every function you call.

## Go deeper
- [Implicit function declarations](https://en.wikipedia.org/wiki/C99#Design) — the rule C99 removed
- [Function declarations (C)](https://en.cppreference.com/w/c/language/function_declaration) — return types and prototypes
- [`<math.h>`](https://en.cppreference.com/w/c/numeric/math) — a header full of `double`-returning functions
