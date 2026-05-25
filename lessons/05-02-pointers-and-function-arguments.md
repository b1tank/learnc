---
id: 05-02-pointers-and-function-arguments
chapter: 5
label: "5.2"
title: Pointers and Function Arguments
prev: 05-01-pointers-and-addresses
next: 05-03-pointers-and-arrays
status: done
---

C passes function arguments **by value**. The function receives a *copy* of the argument; modifying the parameter inside the function doesn't change the caller's variable.

To let a function modify its caller's variables, the caller passes a **pointer** and the function dereferences it.

## The swap example

```c:starter
#include <stdio.h>

void swap_bad(int x, int y);
void swap_good(int *p, int *q);

int main(void) {
    int a = 1, b = 2;

    swap_bad(a, b);
    printf("after swap_bad : a=%d b=%d\n", a, b);

    swap_good(&a, &b);
    printf("after swap_good: a=%d b=%d\n", a, b);
    return 0;
}

void swap_bad(int x, int y) {
    int t = x; x = y; y = t;       /* swaps local copies; caller unchanged */
}

void swap_good(int *p, int *q) {
    int t = *p; *p = *q; *q = t;   /* swaps the values at the addresses */
}
```

```output
after swap_bad : a=1 b=2
after swap_good: a=2 b=1
```

The mechanism: `swap_good(&a, &b)` passes the *addresses* of `a` and `b`. Inside the function, `*p = *q` writes through the pointer back to the caller's storage.

## Returning multiple values

C functions return one value, but pointer parameters let you return more:

```c
/* extract integer part and fraction of a double */
void split(double v, int *whole, double *frac) {
    *whole = (int)v;
    *frac  = v - *whole;
}

int main(void) {
    int    w;
    double f;
    split(3.14159, &w, &f);
    printf("whole=%d frac=%g\n", w, f);      /* 3, 0.14159 */
    return 0;
}
```

This pattern — "the function fills in values through pointer parameters" — is everywhere in the C standard library. `scanf`, `time`, `getline`, `pthread_create`, `read` — all use it.

## Const-correctness

If a function *reads* from its pointer but doesn't *write*, mark it `const`:

```c
size_t my_strlen(const char *s) {
    size_t n = 0;
    while (*s++) ++n;
    return n;
}
```

Now the compiler enforces "don't modify what `s` points to". The function works on `const` and non-`const` strings alike. Without `const`, calling `my_strlen("hello")` (a string literal — read-only) is a portability warning.

## Modern note

- Always declare pointer parameters `const` if the function doesn't modify the pointee. It documents intent, helps the compiler, and makes the function usable with read-only data.
- The C99 `restrict` qualifier on pointer parameters tells the compiler "no other pointer in scope aliases this one" — enables optimisations. Use it sparingly and only when you've thought carefully about aliasing.
- For "in-out parameters" (read and modify), no special qualifier; just a non-const pointer.

## Try it

1. Write `min_max(int v[], int n, int *min, int *max)` that finds both extremes in one pass. The function returns nothing; results come out via the pointer parameters.
2. Try calling `swap_good(a, b)` (without the `&`). Read the compiler error: it says "expected `int *`, got `int`". The type system catches this category of bug.
3. Add `const` to the wrong pointer: try `void swap_good(const int *p, int *q);`. The compiler flags writes to `*p`. Now you can't accidentally modify it.

## Notes from the author

- "Pointer to int" instead of "reference to int" is C-specific phrasing. C++ added `&` references that look like pass-by-value but act like pass-by-pointer; modern languages (Rust, Go) keep the explicit pointer notation but make raw memory access harder. C is the simplest model: everything is bytes, and pointers point to bytes.
- The "fill these out-parameters" idiom is verbose compared to tuple returns in modern languages. But it's *predictable* — there's no hidden allocation or copying, the caller controls where the data goes.
- For a function that needs to return success/failure *and* a value, the idiom is `int do_thing(int x, int *out)` — return code as the value, real result through the pointer. This is the foundation of every Unix system call.

*Click **next →** for the deep equivalence between pointers and arrays.*
