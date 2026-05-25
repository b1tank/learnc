---
id: 05-09-pointers-vs-multi-dimensional-arrays
chapter: 5
label: "5.9"
title: Pointers vs. Multi-dimensional Arrays
prev: 05-08-initialization-of-pointer-arrays
next: 05-10-command-line-arguments
status: done
---

C lets you write `a[i][j]` for both of these:

```c
int  a[3][20];         /* a real 2D array — contiguous 60 ints */
int *b[3];             /* an array of 3 pointers; each may point anywhere */
```

The subscript syntax is identical; the underlying memory layout is completely different. **Knowing which form you have determines what you can do with it.**

## Layout side by side

```
int a[3][20]:                int *b[3]:
  ┌───────────────────┐        ┌─────┐
  │ a[0][0..19]       │        │ b[0]─┐
  ├───────────────────┤        ├─────┤└─→ [some chars]
  │ a[1][0..19]       │        │ b[1]─┐
  ├───────────────────┤        ├─────┤└─→ [other chars]
  │ a[2][0..19]       │        │ b[2]─┐
  └───────────────────┘        └─────┘└─→ [more chars]
  3 * 20 = 60 contiguous ints  3 pointers + separately-allocated strings
```

## Which to choose

| Property              | `int a[3][20]`            | `int *b[3]`                |
|-----------------------|---------------------------|----------------------------|
| Storage location      | One contiguous block       | Pointers + separate blocks |
| Row size              | Fixed (20)                 | Variable per row           |
| Memory cost           | `3 * 20 * sizeof(int)`     | `3 * sizeof(ptr)` + rows   |
| Cache locality        | Excellent                   | Depends on heap layout     |
| Iteration             | Predictable strides         | Pointer-chasing            |
| Resizing rows         | Impossible                  | `realloc` one row at a time|
| Passing to function   | Inner dim must be known     | Just pass the pointer array|

For **rectangular dense data** (matrices, images), use 2D arrays — better cache behaviour, simpler bookkeeping.

For **ragged arrays** (lists of variable-length strings, sparse rows), use pointer arrays.

## A concrete demonstration

```c:starter
#include <stdio.h>
#include <string.h>

int main(void) {
    /* 2D char array — rectangular, fixed width */
    char names_2d[3][10] = { "alice", "bob", "carol" };
    printf("sizeof names_2d = %zu (3*10 = 30)\n", sizeof names_2d);
    printf("names_2d[1] = %s\n", names_2d[1]);

    /* array of char pointers — ragged */
    const char *names_pt[] = { "alice", "bob", "carol" };
    printf("sizeof names_pt = %zu (3 * sizeof(ptr))\n", sizeof names_pt);
    printf("names_pt[1] = %s\n", names_pt[1]);

    /* both work with the same access pattern */
    for (int i = 0; i < 3; ++i)
        printf("[%s] vs [%s]\n", names_2d[i], names_pt[i]);

    return 0;
}
```

```output
sizeof names_2d = 30 (3*10 = 30)
names_2d[1] = bob
sizeof names_pt = 24 (3 * sizeof(ptr))   (or 12 on 32-bit)
names_pt[1] = bob
[alice] vs [alice]
[bob] vs [bob]
[carol] vs [carol]
```

The names *look* identical at use, but the storage and capabilities differ.

## The function-parameter trap

```c
void f1(int a[3][20]) { ... }    /* a is essentially int (*)[20] */
void f2(int *b[3])    { ... }    /* b is essentially int **         */

int aa[3][20];
int *bb[3];

f1(aa);    /* OK */
f1(bb);    /* ERROR: types mismatch */
f2(bb);    /* OK */
f2(aa);    /* ERROR */
```

The compiler will *not* let you accidentally mix these. The error messages are sometimes confusing, but they're catching a real bug — the access patterns are incompatible.

## Modern note

- For matrices and large numeric data, flat 1D arrays with manual indexing (`a[i*cols + j]`) are the most portable. BLAS, LAPACK, NumPy's underlying C buffer — all use this.
- C99 VLAs allow truly dynamic 2D arrays: `void f(int n, int m, int v[n][m])`. Clean, but optional in C11+; check your toolchain.
- The "array of pointers vs. 2D array" choice is also a *cache* choice. Profilers often show that pointer-chasing through an array of pointers is 5–20% slower than a contiguous 2D array, especially for sequential access. Pick based on your access pattern.

## Try it

1. Implement matrix multiplication two ways: once with `int A[N][N]`, once with `int *A[N]`. Compare assembly with `-S -O2`. The 2D version inlines better.
2. Write a function that takes either form and converts to the other. The "pointer-array of fixed-size rows" form lets you write functions that work on both layouts (with adapters).
3. Build a "ragged matrix" (each row a different length) using an array of pointers and a parallel array of lengths. This is how some sparse-matrix libraries store data.

## Notes from the author

- "Same syntax, different layout" is one of those C features that's elegant once you understand it but a foot-gun until you do. Modern languages typically force you to choose at the type level: `Vec<Vec<T>>` vs `Vec<T>` with manual indexing.
- For numeric work, prefer contiguous storage. For text and variable-length data, prefer pointer arrays. The split is so clean that you can almost always tell from the data, not the algorithm.
- Compiler error messages around this ("incompatible pointer type") used to be cryptic; modern Clang gives much better diagnostics. If you're confused by one, paste the line into `cdecl` (the program) for a plain-English translation of the C type.

*Click **next →** for command-line arguments.*
