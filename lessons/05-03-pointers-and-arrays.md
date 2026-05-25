---
id: 05-03-pointers-and-arrays
chapter: 5
label: "5.3"
title: Pointers and Arrays
prev: 05-02-pointers-and-function-arguments
next: 05-04-address-arithmetic
status: done
---

In C, arrays and pointers are deeply connected. Given:

```c
int a[10];
int *p;
```

- `a` (an array name) decays to `&a[0]` in nearly every expression. So `a` *is* a pointer to the first element, except where it isn't (we'll get to that).
- You can write `p = a;` (legal — `a` decays to a pointer), but not `a = p;` (illegal — `a` is not an lvalue).
- After `p = &a[0]`:
  - `*p` is `a[0]`.
  - `*(p + 1)` is `a[1]`.
  - `p[1]` is `a[1]`. (Subscript is just sugar.)
- And by the same rule: `a[i]` is *defined* as `*(a + i)`. So `5[a]` is the same as `a[5]` — both are `*(a + 5)`, and addition commutes. (Don't write `5[a]` in production. But it's a fun trivia.)

## A demonstration

```c:starter
#include <stdio.h>

int main(void) {
    int a[5] = { 10, 20, 30, 40, 50 };
    int *p   = a;                /* p points to a[0] */

    printf("a[0] = %d, *p     = %d\n", a[0], *p);
    printf("a[2] = %d, *(p+2) = %d, p[2] = %d\n", a[2], *(p+2), p[2]);

    p += 3;
    printf("after p += 3: *p = %d\n", *p);     /* a[3] = 40 */

    return 0;
}
```

```output
a[0] = 10, *p     = 10
a[2] = 30, *(p+2) = 30, p[2] = 30
after p += 3: *p = 40
```

## Where the equivalence breaks down

Two places where an array is *not* a pointer:

1. **`sizeof`**. `sizeof a` (where `a` is `int a[10]`) is `40` (10 ints × 4 bytes). `sizeof p` is the size of a pointer (8 bytes on 64-bit). The array remembers its size at compile time; the pointer doesn't.
2. **`&`**. `&a` has type `int (*)[10]` (pointer to array of 10 ints), *not* `int**`. The address numerically equals `&a[0]`, but the type is different.

These are the two ways C "remembers" that you declared an array. Once the array decays into a pointer (e.g. when passed to a function), that memory is lost.

## Function parameter syntax

```c
void f(int a[]);     /* equivalent to: */
void f(int *a);      /* both declare a pointer-to-int parameter */
void f(int a[10]);   /* the 10 is ignored; still just int * */
```

Inside the function, you cannot recover the array's length from `a`. The caller has to pass it as a separate argument:

```c
double avg(const int *a, size_t n) {
    long sum = 0;
    for (size_t i = 0; i < n; ++i) sum += a[i];
    return (double)sum / n;
}
```

This "size by separate parameter" convention is everywhere in C. `qsort`, `memcpy`, `read`, `write` — all of them.

## Modern note

- `<stddef.h>` provides `size_t` and `ptrdiff_t` (the type of a pointer-pointer difference). Use them; `int` for array indices invites overflow on 64-bit data.
- C99 added VLAs (variable-length arrays) — `void f(int n, int a[n])` — but they're now optional in C11/C23 and disabled by many compilers (the Linux kernel banned them in 2018). Avoid in portable code.
- For "array with size attached", build a struct: `struct slice { int *data; size_t len; };`. This is how Go and Rust represent slices natively.

## Try it

1. Write `int sum_array(const int v[], size_t n)` two ways: subscripted (`v[i]`) and pointer-walking (`*p++`). Compile with `-O2 -S` and compare the generated assembly. Modern compilers produce identical code.
2. Confirm `sizeof a` vs `sizeof p` differ for an array and a pointer. Print both.
3. Use `(int)(sizeof a / sizeof a[0])` to compute an array's length. This is the idiomatic C "array_size" trick. Wrap it in a macro: `#define ARRAY_SIZE(x) (sizeof (x) / sizeof (x)[0])`.

## Notes from the author

- The "arrays decay to pointers" rule is the source of more confusion than any other C feature. Burn it into memory: **in almost every expression, the array name evaluates to a pointer to the first element**. The two exceptions (`sizeof`, `&`) are the only places the array nature shows through.
- The `ARRAY_SIZE` macro is portable C-89 magic. In C11 you can do `_Generic`-based versions that reject pointers at compile time. Either way, hand-counting `sizeof a / 4` is brittle (what if you change the element type?).
- For new C code, prefer slice-like structs over bare pointers when you need length. The cost is one extra parameter or struct field; the benefit is bounds-checked iteration and self-documenting APIs.

*Click **next →** for pointer arithmetic.*
