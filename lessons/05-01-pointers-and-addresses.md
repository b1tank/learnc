---
id: 05-01-pointers-and-addresses
chapter: 5
label: "5.1"
title: Pointers and Addresses
prev: ex-4-14
next: 05-02-pointers-and-function-arguments
status: done
---

A **pointer** is a variable whose value is the memory address of another variable. Two operators make pointer programming possible:

| Operator | Meaning                                |
|----------|----------------------------------------|
| `&`      | "address of" — yields a pointer        |
| `*`      | "value at" — dereferences a pointer    |

```c
int  x = 42;
int *p;          /* p is a pointer to int */
p = &x;          /* p now holds the address of x */
printf("%d\n", *p);   /* prints 42 — the value at the address p holds */
```

`*p` and `x` refer to the **same storage** as long as `p == &x`. Writing `*p = 100;` is exactly the same as writing `x = 100;`.

## A worked example

```c:starter
#include <stdio.h>

int main(void) {
    int  x = 1;
    int  y = 2;
    int *p;

    p = &x;
    printf("x=%d, *p=%d, p=%p\n", x, *p, (void*)p);

    *p = 99;                /* modifies x */
    printf("after *p=99: x=%d\n", x);

    p = &y;                 /* p now points to y */
    *p = 77;                /* modifies y */
    printf("after p=&y and *p=77: y=%d, x=%d\n", y, x);

    return 0;
}
```

```output
x=1, *p=1, p=0x7ffc...
after *p=99: x=99
after p=&y and *p=77: y=77, x=99
```

The exact pointer value (`0x7ffc...`) depends on where the OS placed your stack frame today. The values **at** the pointed-to locations are what your program cares about.

## Declaration syntax: read it right-to-left

```c
int  *p;          /* p is a pointer to int */
int  *q, *r;      /* q and r are pointers to int */
int  *s, t;       /* s is a pointer to int; t is just an int (gotcha!) */
const int *cp;    /* cp is a pointer to const int (data is read-only) */
int *const pc;    /* pc is a const pointer to int (pointer is fixed) */
```

The asterisk binds to the *variable name*, not the type. Style-wise the project here writes `int *p` (asterisk next to variable); some style guides write `int* p` (asterisk next to type). The compiler doesn't care; consistency matters.

The `int *s, t;` line is the canonical trap — only `s` is a pointer. To declare two pointers, write `int *s, *t;` or split: `int *s; int *t;`. Modern style prefers one declaration per line.

## `NULL` and the null pointer

`NULL` is a macro that expands to a null pointer constant (typically `((void*)0)` or just `0`). A pointer holding `NULL` does not point to any valid object; dereferencing it is undefined behaviour (usually a crash on modern OSes — the OS protects address 0).

```c
int *p = NULL;
if (p != NULL)
    *p = 5;            /* safe: we checked first */
```

The idiom `if (p)` is short for `if (p != NULL)`. Both are valid; pick one.

## Modern note

- C23 adds `nullptr` — a typed null pointer constant that avoids some of `NULL`'s edge cases (it's strictly a pointer type, not an `int`). Use `NULL` for portability today.
- `<stdint.h>` has `intptr_t` and `uintptr_t` — integer types large enough to hold a pointer. Use them when you genuinely need pointer-as-integer arithmetic.
- Compile with `-fsanitize=address` and `-fsanitize=undefined` during development. AddressSanitizer catches dereferences of freed memory; UndefinedBehaviorSanitizer catches null dereferences and many other pointer bugs.

## Try it

1. Declare three `int` variables and three pointers. Make each pointer point to the corresponding variable; print every value via the pointer.
2. Write a function `void zero(int *p)` that sets the int pointed to by `p` to zero. Call it as `zero(&x);`.
3. Try `int *q;` then `printf("%d\n", *q);` without assigning `q`. What happens? (Likely a segfault.) Now run with `-fsanitize=undefined`; observe the diagnostic.

## Notes from the author

- Pointers are *the* big mental shift in C. Every operation you do in C runs through them eventually: function arguments by reference, arrays, dynamic memory, callbacks, abstract data types. Building solid intuition here pays off for the rest of the chapter.
- Drawing diagrams helps: a box for each variable with its name above and its value inside, an arrow from a pointer to the box it points to. This is how every pointer textbook teaches it for good reason.
- The "uninitialised pointer" trap is among the most dangerous bugs in C. Always initialise pointers (`int *p = NULL;` is fine) so that an accidental dereference fails immediately and reproducibly.

*Click **next →** for pointers as function arguments.*
