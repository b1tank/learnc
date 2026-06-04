---
id: 13-malloc-first-encounter
chapter: 6
label: "6.1"
title: A first encounter with malloc()
prev: 12-pointers-clarifications
next: 14-hidden-metadata-behind-pointer
status: draft
source:
  videoId: ZkaKwWXJXs8
  url: https://www.youtube.com/watch?v=ZkaKwWXJXs8
---

> **Source video.** [Corso di programmazione in C — lezione 12: primo incontro con malloc()](https://www.youtube.com/watch?v=ZkaKwWXJXs8) by Salvatore Sanfilippo.

## TL;DR

`malloc(n)` reserves `n` bytes on the heap and returns a `void *` you can assign to any pointer type. The block lives until you call `free()` on it — so a function can `malloc` something and return it to its caller, which is exactly what local arrays cannot do. Always check for `NULL` and pair every `malloc` with a `free`.

## Walkthrough

### Why you need it `[12:38 → 13:53]`

The previous lesson's prefixed-length-string demo had a ceiling baked into it: every string lived in a fixed-size local buffer. To hold more than one string, or to outlive the function that created it, you need memory whose lifetime *you* control — not the function call stack. That is exactly what `malloc` provides.

### The function `[14:59 → 16:05]`

`malloc(size)` takes a number of bytes and returns a `void *` — a generic memory address with no element type attached. You can assign it to any pointer (`int *`, `char *`, `struct foo *`) and the compiler will not warn, because `void *` converts to and from any object pointer. If the allocator can't satisfy the request, `malloc` returns `NULL`. Check it. Every time.

### Heap vs. stack lifetime `[14:28 → 19:54]`

A local array (`int buf[256];` inside a function) lives on the *stack*: it disappears the moment the function returns, so returning a pointer to it is a bug. A `malloc`-ed block lives on the *heap*: it stays valid until *somebody* calls `free()` on the pointer. That "somebody" is usually a different function from the one that allocated it — and that asymmetry is the whole reason `malloc` exists.

### `free` and leaks `[25:19 → 25:37]`

`free(p)` returns the block at address `p` to the allocator. If your program then exits, the operating system reclaims everything anyway — but in a long-running program, forgotten allocations pile up as a **memory leak** until you run out of address space. Programs should be correct even when the OS would bail them out.

## Example

Allocate an array of `N` ints, fill it with squares, print them, free.

```c:run malloc-squares
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *a = malloc(n * sizeof(int));
    if (a == NULL) return 1;

    for (int i = 0; i < n; i++) a[i] = i * i;
    for (int i = 0; i < n; i++) printf("%d\n", a[i]);

    free(a);
    return 0;
}
```

```output
0
1
4
9
16
```

The size is `n * sizeof(int)` — never just `n`; `sizeof(int)` is typically 4, sometimes 8. The `NULL` check guards against allocation failure. After `free(a)` the pointer itself is stale and must not be dereferenced.

### A function that returns heap memory `[19:15 → 19:54]`

The trick that local arrays cannot do:

```c:run malloc-return-from-function
#include <stdio.h>
#include <stdlib.h>

int *make_squares(int n) {
    int *a = malloc(n * sizeof(int));
    if (a == NULL) return NULL;
    for (int i = 0; i < n; i++) a[i] = i * i;
    return a;  /* still valid after the return — heap, not stack. */
}

int main(void) {
    int *sq = make_squares(5);
    if (sq == NULL) return 1;
    printf("%d %d %d %d %d\n", sq[0], sq[1], sq[2], sq[3], sq[4]);
    free(sq);
    return 0;
}
```

```output
0 1 4 9 16
```

The block survives the return because heap memory is tied to the `free` call, not to any function's lifetime.

## Modern note

`malloc` is one of a small family: `calloc(n, size)` allocates and zero-fills, `realloc(p, new_size)` grows or shrinks an existing block, and C11's `aligned_alloc(align, size)` lets you ask for a specific alignment (useful for SIMD).

## Try it

1. Remove the `free(a)` and run — the program still prints, because the OS cleans up on exit. Now imagine this is a server that runs for weeks.
2. Replace `malloc(n * sizeof(int))` with `malloc(n)` (the bug) and see what `a[1]` reads — you're now indexing past the block.
3. Call `make_squares(0)` — `malloc(0)` is implementation-defined; it may return `NULL` or a valid pointer that you still have to `free`.

## Cross-reference to K&R

[K&R § 8.7 — Example: A Storage Allocator](../../kr/lessons/08-07-example-a-storage-allocator.md) goes one layer deeper: it implements `malloc` and `free` themselves on top of a single underlying `sbrk` syscall. Read it after this lesson to see what the allocator is *actually* doing with your `n` bytes.

## Go deeper

- `man 3 malloc` — the canonical reference; covers `calloc`, `realloc`, `free`, and the `NULL`-return contract.
- cppreference: <https://en.cppreference.com/w/c/memory/malloc> — clearer than the manpage on edge cases like `malloc(0)`.
- Doug Lea's *A Memory Allocator* (<https://gee.cs.oswego.edu/dl/html/malloc.html>) — the design notes behind `dlmalloc`, the ancestor of most modern allocators.
