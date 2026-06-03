---
id: 05-04-address-arithmetic
chapter: 5
label: "5.4"
title: Address Arithmetic
prev: 05-03-pointers-and-arrays
next: 05-05-character-pointers-and-functions
status: done
---

C lets you do arithmetic *on addresses*, but with a twist that makes it safe and portable: pointer arithmetic is **scaled by the pointed-to type**. Adding 1 to an `int *` advances it by `sizeof(int)` bytes (4, typically), not by one byte, so `p + i` always lands on the `i`-th element — never in the middle of one. Subtracting two pointers into the same array gives the *number of elements* between them, not the byte distance. This is the machinery that makes `a[i]` work and that lets you walk through arrays without ever computing a raw byte address.

## Adding, subtracting, comparing pointers

```c:run pointer arithmetic counts elements, not bytes
#include <stdio.h>

int main(void) {
    int a[6] = {0, 10, 20, 30, 40, 50};
    int *start = &a[0];
    int *end   = &a[6];           /* one past the last element (legal to form) */
    printf("elements between: %ld\n", (long)(end - start));

    int *p = &a[1];
    int *q = &a[4];
    printf("q - p = %ld (so 3 ints apart)\n", (long)(q - p));
    printf("*(start + 2) = %d\n", *(start + 2));   /* a[2] */
    return 0;
}
```

```output
elements between: 6
q - p = 3 (so 3 ints apart)
*(start + 2) = 20
```

`end - start` is 6 — the element count — even though the two addresses differ by 24 *bytes*; the compiler divides by `sizeof(int)` for you. `q - p` is 3 for the same reason. The result type of pointer subtraction is `ptrdiff_t` (a signed integer type). You may also **compare** pointers into the same array (`p < q`, `p == q`), which is how loop conditions like `while (p < end)` work — a common idiom for scanning an array with a moving pointer instead of an index.

## The rules that keep it safe (and the line you must not cross)

Pointer arithmetic is only defined *within* a single array (or one element treated as an array of length 1). You may form a pointer to **one past the last element** — that's why `&a[6]` above is legal — and use it as a loop sentinel, but you may **not dereference** it; it marks the end, nothing lives there. Going further (`a - 1`, or `a + 100`) is **undefined behavior** even if you never dereference, because the standard only guarantees addresses inside the array's bounds plus the one-past slot. You also can't add two pointers (meaningless) or multiply them — only `pointer ± integer`, `pointer - pointer`, and comparisons are allowed. This deliberate restriction is what lets the same C code run on machines with wildly different memory layouts: you reason in *elements*, and the compiler translates to the platform's actual byte addresses.

## Go deeper
- [Pointer arithmetic (C)](https://en.cppreference.com/w/c/language/operator_arithmetic#Pointer_arithmetic) — the exact rules
- [`ptrdiff_t`](https://en.cppreference.com/w/c/types/ptrdiff_t) — the type of a pointer difference
- [One-past-the-end pointers](https://en.wikipedia.org/wiki/Pointer_(computer_programming)#C_and_C++) — the legal sentinel
- [Undefined behavior](https://en.cppreference.com/w/c/language/behavior) — what out-of-bounds arithmetic invites
