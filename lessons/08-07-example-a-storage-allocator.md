---
id: 08-07-example-a-storage-allocator
chapter: 8
label: "8.7"
title: 'Example — A Storage Allocator'
prev: ex-8-5
next: ex-8-6
status: done
---

Where does `malloc` get its memory? On Unix, ultimately from the kernel via `sbrk` (legacy) or `mmap` (modern). The C library sits in between, managing free lists so that hundreds of small allocations don't each turn into a system call.

K&R's allocator is a **circular free list with first-fit allocation**. It's small (~60 lines) and pedagogically perfect.

## The data structure

Every block (free or in use) carries a header:

```c
typedef long Align;     /* for alignment */

union header {
    struct {
        union header *ptr;   /* next free block */
        unsigned      size;   /* size in header-units */
    } s;
    Align x;                  /* force alignment */
};
typedef union header Header;
```

The `union` ensures the header is aligned for any type. The user gets a pointer to the byte just past the header.

Free blocks form a **circular linked list** sorted by address. `malloc` walks the list looking for a block big enough; `free` finds the right insertion point and stitches the new free block in (merging with neighbours if adjacent).

## The full code (skeleton)

```c:starter
#include <stdio.h>
#include <unistd.h>

typedef long Align;

union header {
    struct {
        union header *ptr;
        unsigned      size;
    } s;
    Align x;
};
typedef union header Header;

#define NALLOC 1024              /* min units to request from OS */

static Header  base;             /* empty list anchor */
static Header *freep = NULL;     /* start-of-free-list */

static Header *morecore(unsigned nu);
void  my_free(void *ap);
void *my_malloc(unsigned nbytes);

void *my_malloc(unsigned nbytes) {
    unsigned nunits = (nbytes + sizeof(Header) - 1) / sizeof(Header) + 1;

    Header *prevp = freep;
    if (prevp == NULL) {
        base.s.ptr = freep = prevp = &base;
        base.s.size = 0;
    }

    for (Header *p = prevp->s.ptr; ; prevp = p, p = p->s.ptr) {
        if (p->s.size >= nunits) {
            if (p->s.size == nunits) {
                prevp->s.ptr = p->s.ptr;
            } else {
                p->s.size -= nunits;
                p        += p->s.size;
                p->s.size = nunits;
            }
            freep = prevp;
            return (void *)(p + 1);
        }
        if (p == freep) {
            if ((p = morecore(nunits)) == NULL) return NULL;
        }
    }
}

static Header *morecore(unsigned nu) {
    if (nu < NALLOC) nu = NALLOC;
    void *cp = sbrk(nu * sizeof(Header));
    if (cp == (void *)-1) return NULL;
    Header *up = (Header *)cp;
    up->s.size = nu;
    my_free((void *)(up + 1));
    return freep;
}

void my_free(void *ap) {
    Header *bp = (Header *)ap - 1;       /* point to header */
    Header *p;
    for (p = freep; !(bp > p && bp < p->s.ptr); p = p->s.ptr)
        if (p >= p->s.ptr && (bp > p || bp < p->s.ptr))
            break;                       /* freed block at start or end */
    if (bp + bp->s.size == p->s.ptr) {
        bp->s.size += p->s.ptr->s.size;
        bp->s.ptr   = p->s.ptr->s.ptr;
    } else {
        bp->s.ptr = p->s.ptr;
    }
    if (p + p->s.size == bp) {
        p->s.size += bp->s.size;
        p->s.ptr   = bp->s.ptr;
    } else {
        p->s.ptr = bp;
    }
    freep = p;
}

int main(void) {
    int *a = (int *)my_malloc(10 * sizeof *a);
    char *s = (char *)my_malloc(64);
    for (int i = 0; i < 10; ++i) a[i] = i * i;
    for (int i = 0; i < 10; ++i) printf("%d ", a[i]);
    putchar('\n');
    my_free(a);
    my_free(s);
    return 0;
}
```

```output
0 1 4 9 16 25 36 49 64 81
```

## What's happening

1. `my_malloc` rounds the request up to whole `Header` units.
2. Walks the free list looking for a block ≥ that size (first-fit).
3. If the block is exact, unlink it. Otherwise carve off the tail and return that.
4. If no block fits, call `morecore` to grow the heap via `sbrk`, then retry.

`my_free` inserts the freed block into the address-sorted list, coalescing with neighbours that are adjacent in memory.

## Limitations of first-fit

- **Fragmentation**: many small holes too small for any future request.
- **`O(n)` per malloc** as the free list grows.
- **No size classes**: a 16-byte allocation and a 1 MB allocation share the same list.

Modern allocators (tcmalloc, jemalloc, glibc's ptmalloc) use:

- Multiple **size classes** with per-class free lists.
- Per-thread caches to avoid locking.
- Slab/region allocators for very large objects via `mmap`.
- Hugepage support.

But they all build on the same idea: track free blocks and reuse them.

## Try it

1. Print the free list before and after each alloc/free. Watch the carve and coalesce in action.
2. Run a benchmark: 10,000 random `malloc`/`free` pairs with random sizes. Compare against glibc's `malloc`.
3. What's the worst-case behaviour? (Hint: alternate large and small allocations, free only the small ones.)

## Notes from the author

- This allocator is two paychecks of subtle code in one page. Reading it carefully — the carve, the merge, the wraparound condition — teaches more about pointers than any textbook chapter.
- `sbrk` is deprecated in modern POSIX. Real allocators use `mmap` for large blocks and a managed arena for small ones. The interface to the user (`malloc`/`free`) is unchanged.
- Writing your own allocator is a famous performance technique for special-purpose programs — game engines (per-frame allocators), parsers (arena allocators), database internals. The "one allocator fits all" is a myth.

🎉 **You've finished K&R Chapter 8** — and the textbook proper. The remaining lessons are eight exercises that put the system-call API to work: a memory-safe `tail`, a `cat` clone, your own `fopen`/`fclose`/`getc`, and more.

*Click **next →** for exercise 8-1.*
