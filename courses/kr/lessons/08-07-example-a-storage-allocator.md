---
id: 08-07-example-a-storage-allocator
chapter: 8
label: "8.7"
title: 'Example - A Storage Allocator'
prev: ex-8-5
next: ex-8-6
status: done
---

Where does the memory from `malloc` actually come from, and how does `free` give it back? This final example pulls back the curtain on the **storage allocator** - the library code that hands out and reclaims heap memory. An allocator's job is to manage one big region of memory obtained from the operating system, carving it into pieces on `malloc` and stitching freed pieces back together on `free`. We'll build the simplest possible allocator - a **bump allocator** - to see the core mechanic, then explain what a real `malloc` adds.

## A bump allocator from one static pool

```c:run hand out chunks from a fixed pool
#include <stdio.h>
#include <stddef.h>

#define POOL 1024
static char   pool[POOL];     /* the entire arena, one static array */
static size_t used = 0;       /* high-water mark: next free byte     */

void *bump_alloc(size_t n) {
    n = (n + 7) & ~(size_t)7;          /* round up to 8-byte alignment */
    if (used + n > POOL) return NULL;  /* out of memory                */
    void *p = &pool[used];
    used += n;                          /* "bump" the pointer forward   */
    return p;
}

int main(void) {
    char *a = bump_alloc(10);
    int  *b = bump_alloc(sizeof(int) * 4);
    printf("a at offset %ld\n", (long)(a - pool));
    printf("b at offset %ld\n", (long)((char*)b - pool));
    b[0] = 42;
    printf("b[0] = %d, used = %zu bytes\n", b[0], used);
    return 0;
}
```

```output
a at offset 0
b at offset 16
b[0] = 42, used = 32 bytes
```

The whole allocator is one pointer (`used`) into one array. Each request bumps that pointer forward by the (rounded-up) size and returns the old position. `a` lands at offset 0; the 10-byte request is rounded up to 16, so `b` starts at offset 16; `b`'s 16 bytes bring `used` to 32. The **alignment rounding** `(n + 7) & ~7` is essential and easy to overlook: CPUs require (or strongly prefer) that an `int`, pointer, or `double` sit at an address that's a multiple of its size, so a real allocator always returns suitably aligned blocks. A bump allocator is blazing fast and has zero per-block overhead - but it has no `free`: you can only reclaim everything at once by resetting `used` to 0. That limitation is exactly what real allocators solve.

## What a real malloc adds - free lists, and where memory comes from

A general-purpose `malloc`/`free` must let *individual* blocks be returned in any order and reused, which means tracking which regions are free. The classic K&R design (and most real allocators) keeps a **free list**: each block carries a small hidden **header** - storing its size and a pointer to the next free block - that lives just *before* the address handed back to you. `free(p)` looks at `p[-header]` to learn the block's size, links it back into the free list, and **coalesces** it with adjacent free blocks to fight [fragmentation](https://en.wikipedia.org/wiki/Fragmentation_(computing)) (the scattering of free space into too-small gaps). `malloc(n)` walks the free list for a block big enough (first-fit / best-fit strategies), splitting it if there's leftover. When the free list can't satisfy a request, the allocator asks the **operating system** for more memory via [`sbrk`](https://man7.org/linux/man-pages/man2/sbrk.2.html) (grow the heap's "program break" - the classic Unix mechanism) or [`mmap`](https://man7.org/linux/man-pages/man2/mmap.2.html) (map fresh pages, used by modern allocators for large requests). That hidden header is why `free` needs only the pointer, never the size; why writing *before* the returned pointer or past a block's end corrupts the allocator's bookkeeping (a [heap overflow](https://en.wikipedia.org/wiki/Heap_overflow)); and why `free`-ing a non-`malloc` pointer or double-freeing crashes - you're scribbling on metadata. Production allocators (glibc's ptmalloc, jemalloc, tcmalloc) layer on size-class bins, per-thread arenas to avoid lock contention, and hardening against exploitation, but every one of them rests on these two ideas: **a structure tracking free space, replenished from the kernel one big region at a time.** And that ties the whole book together - `malloc` is ordinary C built on the system calls of this chapter, sitting between your program and the kernel's raw memory.

## Go deeper
- [`malloc` internals (K&R-style)](https://en.wikipedia.org/wiki/C_dynamic_memory_allocation) - free lists and headers
- [`sbrk(2)`](https://man7.org/linux/man-pages/man2/sbrk.2.html) / [`mmap(2)`](https://man7.org/linux/man-pages/man2/mmap.2.html) - getting memory from the kernel
- [Memory fragmentation](https://en.wikipedia.org/wiki/Fragmentation_(computing)) - why coalescing matters
- [Data structure alignment](https://en.wikipedia.org/wiki/Data_structure_alignment) - why allocators round sizes up
