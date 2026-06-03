---
id: 05-12-complicated-declarations
chapter: 5
label: "5.12"
title: Complicated Declarations
prev: ex-5-17
next: ex-5-18
status: done
---

C's declaration syntax is notorious: `int (*fp)(int, int)`, `char *(*x[3])(void)`, `int (*(*f)(int))[5]`. The trouble is that `*`, `[]`, and `()` combine in an order driven by **precedence**, not left-to-right reading. The cure is a mechanical rule: start at the identifier and read **outward**, applying `()` and `[]` (which bind tighter) before `*`, using parentheses to override. This "right-left" / spiral reading turns any declaration into plain English. The guiding C principle is *declaration mirrors use*: you declare a thing the same way you'd use it in an expression.

## Reading a declaration outward

```c:run a pointer to a function, declared and used
#include <stdio.h>

int add(int a, int b) { return a + b; }

int main(void) {
    /* fp: start at fp -> "(*fp)" so fp is a pointer -> "(int,int)" to a
       function taking two ints -> "int" returning int.
       i.e. fp is a pointer to a function (int,int) returning int. */
    int (*fp)(int, int) = add;
    printf("fp(4,5) = %d\n", fp(4, 5));

    /* A typedef hides the noise: BinOp names that exact pointer type. */
    typedef int (*BinOp)(int, int);
    BinOp op = add;
    printf("op(10,20) = %d\n", op(10, 20));
    return 0;
}
```

```output
fp(4,5) = 9
op(10,20) = 30
```

Read `int (*fp)(int, int)` by starting at `fp` and working out: the parentheses group `(*fp)`, so **`fp` is a pointer**; to its right is `(int, int)`, so it points **to a function taking two ints**; the leading `int` is the **return type**. Compare the two declarations that differ by only the parentheses: `int (*fp)(int,int)` is *a pointer to a function returning int*, while `int *fp(int,int)` is *a function returning a pointer to int* — the `()` around `*fp` is what makes the difference, because without it the `(int,int)` binds first. The `typedef` version shows the practical escape hatch: name the ugly type once (`BinOp`) and every later use reads cleanly.

## Precedence rules and the `typedef` escape

The whole system follows three facts: (1) `[]` and `()` have **higher precedence** than `*`, so they apply first; (2) you read **right then left** from the identifier, honoring any parentheses; (3) `const` binds to whatever is on its left (so `char * const p` is a *const pointer to char*, while `const char *p` is a *pointer to const char*). Work a hard one outward: `char *(*x[3])(void)` — `x` is an **array of 3** (`[3]`), of **pointers** (`*`), to **functions taking void** (`(void)`), **returning `char *`**. In real code you almost never write these raw; you `typedef` each layer (`typedef char *(*Handler)(void); Handler x[3];`) so the declaration documents intent and the compiler error messages stay readable. When you do meet a gnarly declaration in someone else's code, two tools help: the classic [`cdecl`](https://cdecl.org/) translator turns C gibberish into English and back, and the right-left rule above will always get you there by hand.

## Go deeper
- [Declarations (C)](https://en.cppreference.com/w/c/language/declarations) — the grammar in full
- [The "clockwise/spiral" rule](https://c-faq.com/decl/spiral.anderson.html) — a reading mnemonic
- [`typedef`](https://en.cppreference.com/w/c/language/typedef) — taming complex types
- [cdecl.org](https://cdecl.org/) — translate declarations to/from English
