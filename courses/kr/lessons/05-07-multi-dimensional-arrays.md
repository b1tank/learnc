---
id: 05-07-multi-dimensional-arrays
chapter: 5
label: "5.7"
title: Multi-dimensional Arrays
prev: 05-06-pointer-arrays
next: ex-5-8
status: done
---

C supports **multi-dimensional arrays** like `int grid[2][3]`, but it's important to see how they're really laid out: there are no "rows" and "columns" in hardware — memory is one-dimensional. A 2-D array is stored as a single contiguous block in **row-major order**: all of row 0's elements, then all of row 1's, and so on. The `[r][c]` syntax is just convenient notation the compiler turns into a single offset calculation. Understanding the flat layout explains the performance behavior and the rule about passing such arrays to functions.

## Row-major storage

```c:run a 2-D array is rows laid end to end
#include <stdio.h>

int main(void) {
    int grid[2][3] = { {1, 2, 3}, {4, 5, 6} };
    for (int r = 0; r < 2; r++) {
        for (int c = 0; c < 3; c++)
            printf("%s%d", c ? " " : "", grid[r][c]);
        printf("\n");
    }
    printf("grid[1][2] = %d\n", grid[1][2]);
    return 0;
}
```

```output
1 2 3
4 5 6
grid[1][2] = 6
```

In memory `grid` is the six ints `1 2 3 4 5 6` in a row. The compiler computes `grid[r][c]` as `*(base + r*3 + c)` — `r` skips whole rows (3 ints each), then `c` picks within the row. So `grid[1][2]` is element `1*3 + 2 = 5` (zero-based), which holds 6. The **number of columns** (3 here) is baked into that formula, which is why it must be known at compile time for fixed arrays. This row-major layout also has a real performance consequence: iterating with the *last* index changing fastest (as above) walks memory sequentially, which the [CPU cache](https://en.wikipedia.org/wiki/CPU_cache) loves; iterating column-first jumps around and thrashes the cache.

## Passing 2-D arrays to functions

When you pass `grid` to a function, it decays — like any array — to a pointer to its first *element*, but here the "first element" is itself an array: `grid` decays to `int (*)[3]`, a *pointer to an array of 3 ints*. That's why a function parameter must specify all dimensions except the first: `void f(int g[][3], int rows)` or equivalently `void f(int (*g)[3], int rows)`. The compiler needs the column count (3) to do the `r*3 + c` arithmetic; it can compute row offsets only if it knows how wide a row is. The leading dimension is the one it *doesn't* need (you supply it as a separate `rows` argument), because nothing is ever multiplied by it. If you want fully dynamic dimensions, you either use a C99 [variable-length array](https://en.cppreference.com/w/c/language/array#Variable-length_arrays) parameter (`int g[rows][cols]`) or fall back to a flat `int *` plus manual `i*cols + j` indexing — the latter is the most portable choice for runtime-sized matrices.

## Go deeper
- [Multidimensional arrays (C)](https://en.cppreference.com/w/c/language/array#Multidimensional_arrays) — declaration and decay
- [Row- and column-major order](https://en.wikipedia.org/wiki/Row-_and_column-major_order) — the storage convention
- [CPU cache & locality](https://en.wikipedia.org/wiki/Locality_of_reference) — why iteration order matters
- [Variable-length arrays](https://en.cppreference.com/w/c/language/array#Variable-length_arrays) — runtime-sized dimensions
