---
id: 05-09-pointers-vs-multi-dimensional-arrays
chapter: 5
label: "5.9"
title: Pointers vs. Multi-dimensional Arrays
prev: ex-5-9
next: 05-10-command-line-arguments
status: done
---

`char *name[3]` and `char name[3][6]` look similar and can even be indexed the same way, but they are **fundamentally different objects** in memory — and choosing between them is a real design decision. The first is an *array of pointers*: three addresses, each pointing to a string that can live anywhere, at any length (ragged). The second is a *true 2-D array*: one contiguous rectangular block of 3 × 6 bytes, every row the same width. Seeing the memory difference makes the trade-offs obvious.

## Same syntax, different memory

```c:run array-of-pointers vs rectangular 2-D array
#include <stdio.h>

int main(void) {
    char *pa[3]    = {"hi", "hello", "hey"};   /* 3 pointers, ragged */
    char  ma[3][6] = {"hi", "hello", "hey"};   /* one fixed 3x6 block */

    printf("pa: %s %s %s\n", pa[0], pa[1], pa[2]);
    printf("ma: %s %s %s\n", ma[0], ma[1], ma[2]);
    printf("sizeof pa = %zu, sizeof ma = %zu\n", sizeof pa, sizeof ma);
    return 0;
}
```

```output
pa: hi hello hey
ma: hi hello hey
sizeof pa = 12, sizeof ma = 18
```

Both print the same strings and both accept `[i]` indexing, but `sizeof` exposes the difference. `pa` is 12 bytes here: three pointers (4 bytes each in this WebAssembly runtime — 8 each on a typical 64-bit native build), with the actual strings ("hi", "hello", "hey") stored separately as read-only literals of *their own* lengths. `ma` is 18 bytes: a single 3 × 6 block where each string is copied in and padded with `'\0'` to fill its row — "hi" wastes 3 bytes of padding, and every row is forced to be 6 wide whether it needs it or not. So `pa[1]` is "follow a pointer to wherever "hello" lives," while `ma[1]` is "the address `ma + 1*6`," a fixed offset into the block.

## How to choose

Use the **array of pointers** when the strings vary in length, when they're string *literals* (constant, shared), or when you want to rearrange them cheaply — sorting `pa` swaps 8-byte addresses regardless of string length, and adds no padding waste. Use the **rectangular array** when you need one self-contained, writable, contiguous buffer (e.g. to `memcpy` the whole thing, write it to a file, or modify characters in place) and the uniform width is acceptable. The decay rules also differ: `pa[i]` is already a `char *` you can reassign (`pa[0] = "new"`), whereas `ma[i]` is an *array* (a fixed location) you can write *into* but cannot repoint. In short: pointers-to-strings buy flexibility and compactness at the cost of an extra indirection and non-contiguous storage; the 2-D array buys a single solid block at the cost of padding and a frozen width. Picking the right one is a recurring judgment call in C.

## Go deeper
- [Array of pointers vs 2-D array](https://en.cppreference.com/w/c/language/array) — declaration semantics
- [Array-to-pointer decay](https://en.cppreference.com/w/c/language/array#Array_to_pointer_conversion) — why `ma[i]` isn't reassignable
- [Ragged array](https://en.wikipedia.org/wiki/Jagged_array) — the pointer-array shape
- [`sizeof`](https://en.cppreference.com/w/c/language/sizeof) — measuring the difference
