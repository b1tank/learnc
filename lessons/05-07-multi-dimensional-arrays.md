---
id: 05-07-multi-dimensional-arrays
chapter: 5
label: "5.7"
title: Multi-dimensional Arrays
prev: 05-06-pointer-arrays
next: ex-5-8
status: done
---

C supports multi-dimensional arrays as "arrays of arrays". Declared by chained subscripts:

```c
int   grid[3][4];          /* 3 rows, each 4 ints */
char  board[8][8];          /* a chessboard */
int   cube[2][3][4];        /* 3D: 2 layers, 3 rows, 4 cols */
```

Storage is **row-major**: `grid[0][0], grid[0][1], ..., grid[0][3], grid[1][0], ...`. The rightmost index varies fastest.

## Days-in-month example

```c:starter
#include <stdio.h>

static int day_of_year(int year, int month, int day);

int main(void) {
    printf("Mar  1, 2024 = day %d\n", day_of_year(2024, 3, 1));
    printf("Dec 31, 2024 = day %d\n", day_of_year(2024, 12, 31));
    printf("Feb 28, 2023 = day %d\n", day_of_year(2023, 2, 28));
    return 0;
}

static int day_of_year(int year, int month, int day) {
    /* day_tab[0] = non-leap; day_tab[1] = leap */
    static const int day_tab[2][13] = {
        { 0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 },
        { 0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 },
    };

    int leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    int total = day;
    for (int i = 1; i < month; ++i)
        total += day_tab[leap][i];
    return total;
}
```

```output
Mar  1, 2024 = day 61
Dec 31, 2024 = day 366
Feb 28, 2023 = day 59
```

`day_tab[leap][i]` reads "in the `leap` row (0 or 1), pick column `i`". The compiler computes the address as `&day_tab + (leap * 13 + i) * sizeof(int)`.

## Passing 2D arrays to functions

When you pass a multi-dim array to a function, **all but the leftmost dimension must be known** to the compiler:

```c
void f(int v[][13]) { ... }      /* OK: rightmost size given */
void f(int (*v)[13]) { ... }     /* equivalent: pointer to "array of 13 ints" */
void f(int v[2][13]) { ... }     /* OK: both sizes (only the 13 matters) */
void f(int v[][])  { ... }       /* ERROR: must know inner size */
```

The reason: the compiler computes `v[i][j]` as `*(v + i*innerSize + j)`. It must know `innerSize` at compile time.

For truly dynamic sizes, you have three choices:

1. **Pass a flat 1D pointer + dimensions**: `void f(int *v, int rows, int cols)`, index as `v[i*cols + j]`.
2. **Pass an array of pointers** (§5.6 style): each row separately allocated.
3. **C99 VLA** (variable-length array parameter): `void f(int rows, int cols, int v[rows][cols])` — clean syntax, but optional in C11 and discouraged for portable code.

The flat 1D pointer (option 1) is the most portable and the easiest to optimise.

## Pointers and multi-dim arrays

`grid[i][j]` is `*(*(grid + i) + j)`. Each `*` dereference walks one level of the array structure. Pointer-of-pointers (e.g. `char **`) is *not* the same as a 2D array:

```c
int a[3][4];        /* contiguous 12 ints, row-major */
int **b;            /* pointer to pointer to int — NOT a 2D array */
```

You can't pass `a` to a function expecting `int **`. The types disagree.

## Modern note

- `sizeof a` for `int a[3][4]` is `3 * 4 * sizeof(int)` = `48`. The compile-time size info is preserved within the declaring scope.
- For large 2D arrays, allocate flat: `int *m = malloc(rows * cols * sizeof *m); m[i*cols + j] = v;`. Better cache locality than array-of-pointers; one allocation instead of N+1.
- Cache-friendliness: row-major C arrays iterate fast as `for i { for j { v[i][j]; }}` — outer i, inner j matches the memory layout. Reverse the loop order and you'll cache-miss every iteration on large data.

## Try it

1. Print a multiplication table `9x9` using `int table[10][10]; for (i=1; i<=9; ++i) for (j=1; j<=9; ++j) table[i][j] = i*j;`. Then `printf` the table.
2. Implement matrix transpose: `void transpose(int n, int m, int A[n][m], int B[m][n])`. Watch the index pattern.
3. Try writing `void print_2d(int **a, int rows, int cols)` and passing a `int a[3][3]` to it. Read the compile error and figure out why pointer-to-pointer is not pointer-to-array.

## Notes from the author

- The "C arrays are arrays of arrays, not pointer-to-pointer" rule confuses every newcomer. The cleanest fix in modern C: pass `(rows, cols, flat_pointer)` and index manually. Then there's no row-pointer indirection to manage.
- For numeric computing, libraries like BLAS work on flat 1D arrays with explicit strides. The row-major / column-major debate is one of computing's oldest food fights (Fortran is column-major, C is row-major).
- VLAs as function parameters are *almost* a great feature — clean syntax, exact bounds info — but they were made optional in C11 because some embedded toolchains struggled with them. Don't use them in code that might compile under those toolchains.

*Click **next →** for initialising pointer arrays.*
