---
id: 05-11-pointers-to-functions
chapter: 5
label: "5.11"
title: Pointers to Functions
prev: ex-5-13
next: ex-5-14
status: done
---

A function in C has an address, just like a variable. A **function pointer** stores that address; calling through the pointer invokes the function.

Declaration syntax — read carefully:

```c
int  (*fp)(int, int);
```

That's: `fp` is a pointer to a function that takes two `int`s and returns `int`. The parentheses around `*fp` are mandatory; without them you'd get `int *fp(int, int);` which is "function returning pointer to int".

## A simple example

```c:starter
#include <stdio.h>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int sub(int a, int b) { return a - b; }

int apply(int (*op)(int, int), int a, int b) {
    return op(a, b);              /* call through pointer */
}

int main(void) {
    printf("add(3, 4) = %d\n", apply(add, 3, 4));
    printf("mul(3, 4) = %d\n", apply(mul, 3, 4));
    printf("sub(3, 4) = %d\n", apply(sub, 3, 4));

    /* arrays of function pointers — dispatch table */
    int (*ops[])(int, int) = { add, mul, sub };
    for (int i = 0; i < 3; ++i)
        printf("ops[%d](10, 2) = %d\n", i, ops[i](10, 2));
    return 0;
}
```

```output
add(3, 4) = 7
mul(3, 4) = 12
sub(3, 4) = -1
ops[0](10, 2) = 12
ops[1](10, 2) = 20
ops[2](10, 2) = 8
```

## Callback patterns

The most familiar function pointer: a comparator passed to `qsort`.

```c
int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);     /* -1, 0, +1; no overflow */
}

int main(void) {
    int v[] = { 3, 1, 4, 1, 5, 9, 2, 6 };
    qsort(v, 8, sizeof v[0], cmp_int);
    /* v is now sorted */
}
```

`qsort` doesn't know about `int`s; it knows about *byte ranges* and *comparator functions*. The function pointer is the polymorphism.

## Typedefs make pointer types tolerable

```c
typedef int (*binop)(int, int);

binop op = add;
int   r  = op(3, 4);

int apply(binop op, int a, int b) {
    return op(a, b);
}
```

Once you have several uses, the `typedef` pays off. (For C23, `typedef` no longer requires the `typedef` keyword for function pointers in *some* contexts — but the explicit form is portable.)

## The `&` and `*` are optional

These are all the same:

```c
int (*fp)(int, int) = add;       /* function decays to pointer */
int (*fp)(int, int) = &add;      /* explicit address-of */
fp(3, 4);
(*fp)(3, 4);
(&add)(3, 4);    /* &-back-then-call also works */
```

C treats function names like array names: they decay to pointers in most expressions. Convention: write the bare names (`fp = add; fp(3, 4);`). It's cleaner.

## Modern note

- `<stdlib.h>` `qsort` and `bsearch` are the C library's canonical function-pointer APIs. C11 added `qsort_s` (bounds-checked) and `bsearch_s`; not widely used.
- Function pointers don't carry captured state — they're plain code addresses. For closures (function + captured state), you need to pass a `void *user_data` alongside. Many APIs (`pthread_create`, GLib, GTK) do this.
- The `*(const int *)a` cast in `cmp_int` is the price of `qsort`'s `void *` interface. Modern alternatives (`qsort_r` with a separate context pointer, or sort-by-key libraries) avoid the cast. But the standard `qsort` is everywhere.

## Try it

1. Write a generic `map(int *arr, size_t n, int (*f)(int))` that applies `f` to every element in place.
2. Build a small command dispatch: `struct cmd { const char *name; void (*fn)(int argc, char **argv); };` and an array of them. Look up by name on input.
3. Pass `cmp_int` to `qsort` and a descending comparator (`return -cmp_int(a, b)`). Same function pointer mechanism, different ordering.

## Notes from the author

- Function pointers are how C does polymorphism, callbacks, and plugin systems. Every "object" in classic Unix kernels and many production C libraries (cURL, libuv, OpenSSL) is a struct full of function pointers — manual vtables.
- The declaration syntax is genuinely ugly. `void (*signal(int sig, void (*func)(int)))(int)` is the famous example from `<signal.h>` — a function that takes a function pointer and returns a function pointer. Typedefs make this readable; never write nested function pointer types inline.
- The lack of closures is the *real* limitation. C's "function + context pointer" idiom (pass a `void *user_data` along with the function) works but verbose. C++ lambdas, Rust closures, and Go function values all bake this together.

*Click **next →** for the truly nightmarish declarations.*
