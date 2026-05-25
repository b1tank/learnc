---
id: 05-04-address-arithmetic
chapter: 5
label: "5.4"
title: Address Arithmetic
prev: 05-03-pointers-and-arrays
next: 05-05-character-pointers-and-functions
status: done
---

Pointers support a limited, *typed* arithmetic:

| Expression | Result                                             |
|------------|----------------------------------------------------|
| `p + i`    | `p` advanced by `i` *elements* (not bytes!)         |
| `p - i`    | `p` moved backwards by `i` elements                 |
| `++p`, `p++` | Move forward one element                          |
| `--p`, `p--` | Move backward one element                         |
| `p - q`    | Number of elements between `p` and `q` (`ptrdiff_t`)|
| `p == q`, `p < q`, `p > q` | Pointer comparisons (within one array) |

The compiler scales by `sizeof(*p)` automatically. If `p` is `int *` (4-byte ints) and you write `p + 3`, the address advances by 12 bytes. **You think in elements; the compiler thinks in bytes.**

## A walk through an array

```c:starter
#include <stdio.h>

int main(void) {
    int v[] = { 10, 20, 30, 40, 50 };
    int *p  = v;        /* &v[0] */
    int *end = v + 5;   /* one past the last element */

    /* idiomatic pointer-walk loop */
    while (p < end) {
        printf("addr=%p  val=%d\n", (void*)p, *p);
        ++p;
    }

    /* size of the array via pointer subtraction */
    printf("array has %td elements\n", end - v);
    return 0;
}
```

```output
addr=0x7ffc...  val=10
addr=0x7ffc...  val=20
addr=0x7ffc...  val=30
addr=0x7ffc...  val=40
addr=0x7ffc...  val=50
array has 5 elements
```

The `%td` format is for `ptrdiff_t`. Use it; don't cast to `int` (overflow on huge arrays).

## "One past the end" is legal

C explicitly allows you to form (but not dereference) a pointer to *one element past* the last in an array. This is what `v + 5` is above. It's used as a loop sentinel and is the basis of `strchr`, `strrchr`, and friends returning `NULL` vs the end.

```c
for (int *p = v; p < v + 5; ++p)
    printf("%d\n", *p);
```

vs. equivalent index form:

```c
for (int i = 0; i < 5; ++i)
    printf("%d\n", v[i]);
```

The compiler generates identical code from either. Style choice: use indices for "I want to see the position", pointer walks for "this is just a sweep".

## Forbidden pointer arithmetic

- Adding two pointers: nonsense. `p + q` doesn't compile.
- Pointer arithmetic across arrays: technically undefined if `p` and `q` point into different objects.
- Multiplying or dividing pointers: not defined.
- Comparing pointers from different arrays with `<` or `>`: undefined (equality is fine).

Realistically you won't accidentally do most of these — the type system or compile errors catch them. The "across arrays" rule is the one that bites: if you have two separately-allocated buffers, comparing pointers between them isn't guaranteed to make sense.

## Modern note

- AddressSanitizer (`-fsanitize=address`) detects out-of-bounds pointer arithmetic at runtime. Use it in every dev build.
- `ptrdiff_t` may be smaller than `size_t` on huge address spaces. For sub-2GB arrays you're safe; for anything else, store sizes in `size_t`.
- The "one past the end" sentinel makes half-open intervals `[start, end)` the idiomatic C pattern — matching mathematical convention and avoiding off-by-one errors.

## Try it

1. Implement `void *my_memcpy(void *dst, const void *src, size_t n)` using pointer walks. Cast to `unsigned char *` so the arithmetic is in bytes.
2. Write a function that finds the median of an array by pointer-walking, then explain why "median requires sorting first" makes this exercise misleading. (Use `qsort` or write a partial sort.)
3. Try `int v[5]; int *p = v + 100;`. The pointer formation may or may not crash (C says "UB"), but dereferencing it definitely will.

## Notes from the author

- Pointer arithmetic scales by element size automatically. This is one of the cleanest design choices in C: code looks the same whether you're walking `int`s, `double`s, or `struct foo`s.
- Old C books emphasised pointer-walking as faster than indexing. Modern compilers transform between them freely at `-O2`; pick the form that reads better.
- The "half-open interval `[begin, end)`" pattern, copied from C into C++ STL, Rust's `Range`, and Python's `range`, originates in this section of K&R. It's that influential.

*Click **next →** for character pointers and string functions.*
