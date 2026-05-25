---
id: 03-03-else-if
chapter: 3
label: "3.3"
title: Else-If
prev: 03-02-if-else
next: ex-3-1
status: done
---

`else if` isn't actually a keyword in C — it's just `else` followed by `if`. The conventional formatting

```c
if (cond1) {
    ...
} else if (cond2) {
    ...
} else if (cond3) {
    ...
} else {
    ...
}
```

is what you get when you collapse nested `else { if (...) { ... } }` chains by keeping the inner `if` on the same line as the outer `else`.

The semantics are: conditions are tested in order; the first one that's true gets its body run; everything else is skipped.

## A practical example — binary search

```c:starter
#include <stdio.h>

/* return index of x in v[0..n-1], or -1 */
int binsearch(int x, const int v[], int n);

int main(void) {
    int v[] = { 1, 3, 5, 7, 9, 11, 13, 15 };
    int n   = sizeof(v) / sizeof(v[0]);

    printf("found 7 at %d\n",  binsearch(7,  v, n));
    printf("found 11 at %d\n", binsearch(11, v, n));
    printf("found 4 at %d\n",  binsearch(4,  v, n));
    return 0;
}

int binsearch(int x, const int v[], int n) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (x < v[mid])
            hi = mid - 1;
        else if (x > v[mid])
            lo = mid + 1;
        else
            return mid;
    }
    return -1;
}
```

```output
found 7 at 3
found 11 at 5
found 4 at -1
```

The classical three-way comparison maps perfectly to `if`/`else if`/`else`.

## When to choose `else if` vs `switch`

- **`else if` chains** suit *arbitrary expressions*: range tests, complex booleans, function-result branches.
- **`switch`** (next lesson) suits *equality* against a finite set of integer constants.

If your chain is doing `if (n == 1) ... else if (n == 2) ... else if (n == 3) ...`, that's a `switch` waiting to happen.

## Watch the `(lo + hi) / 2` overflow

The line `int mid = (lo + hi) / 2;` is famously buggy when `lo + hi` overflows `INT_MAX`. For arrays under a billion elements you're safe; for larger ones the textbook trick is `mid = lo + (hi - lo) / 2;` which never overflows.

This was an actual bug in Java's built-in binary search, untouched for nearly a decade. Two-billion-element arrays are normal in modern data systems.

## Modern note

For chains over a small set of integer constants, prefer `switch`. The compiler can generate a jump table — usually faster than a linear chain — and the structure documents "these are the cases" at a glance.

## Notes from the author

- An `else if` chain that has more than ~6 branches is asking to be a `switch`, a lookup table, or a function pointer dispatch. Long chains hide subtle ordering bugs (one branch may inadvertently mask another).
- The overflow in `(lo + hi) / 2` is a small thing that's caused real outages. The habit of writing `lo + (hi - lo) / 2` is free; adopt it for everything index-arithmetic.
- The three-way comparison in `binsearch` exposes a recurring idiom: when you have a comparison function `cmp(a, b)` returning negative/zero/positive, the `else if`/`else` cascade falls out of the comparison naturally. Many sort and search routines use this exact pattern.

*Click **next →** for `switch`.*
