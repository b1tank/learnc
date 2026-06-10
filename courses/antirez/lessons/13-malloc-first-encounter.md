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

> **Source video.** [Let's Learn C - lesson 12](https://www.youtube.com/watch?v=ZkaKwWXJXs8) by Salvatore Sanfilippo (antirez).

## TL;DR

`malloc(n)` reserves `n` bytes on the heap and returns a `void *` you can assign to any pointer type. The block lives until you call `free()` on it - so a function can `malloc` something and return it to its caller, which is exactly what local arrays cannot do. Always check for `NULL` and pair every `malloc` with a `free`.

## Why you need it `[12:38 → 13:53]`

The previous lesson's prefixed-length-string demo had a ceiling baked into it: every string lived in a fixed-size local buffer. To hold more than one string, or to outlive the function that created it, you need memory whose lifetime *you* control - not the function call stack. In a higher-level language like Python you write `a = "hello"` and the runtime allocates and frees behind your back; in C the allocation is yours to ask for and yours to give back. That is exactly what `malloc` provides.

## The malloc and free functions `[14:59 → 16:05]`

`malloc(size)` takes a number of bytes and returns a `void *` - a generic memory address with no element type attached. You can assign it to any pointer (`int *`, `char *`, `struct foo *`) and the compiler will not warn, because `void *` converts to and from any object pointer. If the allocator can't satisfy the request, `malloc` returns `NULL`. Check it. Every time. `free(p)` hands the block back. One `malloc`, one matching `free`.

Allocate an array of `n` ints, fill it with squares, print them, free:

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

The size is `n * sizeof(int)` - never just `n`; `sizeof(int)` is typically 4, sometimes 8. The `NULL` check guards against allocation failure. After `free(a)` the pointer itself is stale and must not be dereferenced.

## Heap vs. stack lifetime `[14:28 → 19:54]`

A local array (`int buf[256];` inside a function) lives on the *stack*: it disappears the moment the function returns, so returning a pointer to it is a bug. A `malloc`-ed block lives on the *heap*: it stays valid until *somebody* calls `free()` on the pointer. That "somebody" is usually a different function from the one that allocated it - and that asymmetry is the whole reason `malloc` exists.

This is the trick a local array cannot do - allocate inside a function and return the live pointer:

```c:run malloc-return-from-function
#include <stdio.h>
#include <stdlib.h>

int *make_squares(int n) {
    int *a = malloc(n * sizeof(int));
    if (a == NULL) return NULL;
    for (int i = 0; i < n; i++) a[i] = i * i;
    return a;  /* still valid after the return - heap, not stack. */
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

## Freeing and leaks `[25:19 → 25:37]`

`free(p)` returns the block at address `p` to the allocator. If your program then exits, the operating system reclaims everything anyway - but in a long-running program, forgotten allocations pile up as a **memory leak** until you run out of address space. Programs should be correct even when the OS would bail them out.

## What an uninitialised block holds

`malloc` gives you raw, *indeterminate* bytes - it does not clear them. A freshly freed block usually goes back to the allocator and is handed straight out again on the next request of the same size, stale contents and all. You can watch it happen: scribble a pattern, free, allocate the same size again, and read the tail (the allocator overwrites only the first few bytes with its own bookkeeping):

```c:run uninitialised-vs-calloc
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *a = malloc(8 * sizeof(int));
    for (int i = 0; i < 8; i++) a[i] = 0x41424344;
    free(a);

    /* Same size again: glibc hands back the block we just freed. */
    int *b = malloc(8 * sizeof(int));
    printf("stale tail from malloc: %08x\n", b[7]);
    free(b);

    /* calloc zero-fills the whole block before handing it back. */
    int *c = calloc(8, sizeof(int));
    printf("calloc gives zeroes:    %08x\n", c[7]);
    free(c);
    return 0;
}
```

```output
stale tail from malloc: 41424344
calloc gives zeroes:    00000000
```

So reach for `calloc(n, size)` when you want a zeroed block (it also checks `n * size` for overflow), and never read a `malloc`-ed element before you write it. `realloc(p, new_size)` grows or shrinks a block, copying the old bytes; C11's `aligned_alloc(align, size)` asks for stricter alignment.

## NULL on failure, and the cast question

When the allocator cannot satisfy a request it returns `NULL` rather than crashing. Ask for an impossible size and you can see the guard fire:

```c:run malloc-null
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

int main(void) {
    void *p = malloc(SIZE_MAX);
    printf("malloc(SIZE_MAX) is NULL? %s\n", p == NULL ? "yes" : "no");
    free(p);   /* free(NULL) is defined and does nothing */
    return 0;
}
```

```output
malloc(SIZE_MAX) is NULL? yes
```

Note `free(NULL)` is always safe, which keeps cleanup paths simple. As for casting: in C you do **not** write `int *a = (int *)malloc(...)`. `void *` converts to any object pointer on its own, the cast is noise, and worse - if you forget `#include <stdlib.h>`, the cast hides the warning that `malloc` was assumed to return `int`, producing real bugs on systems where pointers are wider than `int`. (C++ does require the cast, which is why you see it in mixed codebases.) Leave it out and let the compiler watch your back.
