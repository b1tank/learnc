---
id: 17-strings-with-reference-counting
chapter: 7
label: "7.2"
title: A string library with reference counting
prev: 16-structs-as-data-structure-bricks
next: 18-string-design-and-hexdump
status: draft
source:
  videoId: VPs_QtlLNcs
  url: https://www.youtube.com/watch?v=VPs_QtlLNcs
---

> **Source video.** [Let's Learn C - lesson 16](https://www.youtube.com/watch?v=VPs_QtlLNcs) by Salvatore Sanfilippo (antirez).

## TL;DR

Wrap a string in a struct whose header carries a **length** and a **reference count**, immediately followed by the bytes themselves. Sharers bump the counter (`str_incref`) instead of copying, and only the *last* `str_decref` actually frees the allocation.

## Walkthrough

### The header struct `[01:17 → 02:36]`

The whole library hangs on one shape:

```c
typedef struct {
    size_t len;
    size_t refcount;
    char   data[];     /* C99 flexible array member */
} mystring_t;
```

`data[]` is not a separate allocation - it's a *flexible array member* that lives in the same `malloc` block, right after the header. One call returns a pointer that owns both the metadata and the bytes.

### Why a refcount at all `[03:12 → 04:34]`

Plain `malloc`/`free` forces a single owner. Refcounting lets several places hold the same string honestly: each owner calls `incref` when it takes a reference and `decref` when it lets go. The constructor returns the object with `refcount == 1`, never zero - otherwise the first `decref` would free an object the caller has just stored.

### The two-function API `[10:06 → 12:45]`

The whole protocol is two lines:

- `str_incref` - `++refcount`. Call it whenever you make a *new* alias.
- `str_decref` - `--refcount`, and if it hits zero, `free`.

That's it. The language has no GC; this *is* the GC, written by hand.

### Free-on-zero, cloning, and bug catchers `[08:28 → 09:21, 22:34]`

Double-`decref` underflows the counter, so a defensive version checks `refcount == 0` on entry and aborts; the video also adds a `magic` field (e.g. `0xDEADBEEF`) zeroed at free time so use-after-free becomes an abort instead of silent corruption. The payoff: the same string in two linked lists takes one allocation, not two - a counter goes `2 → 1 → 0` as references drop, much safer than scattering `strdup`/`free` pairs.

### Catching use-after-free with a magic number `[17:07 → 21:46]`

Checking `refcount == 0` on entry sounds like it would catch a double-free, but it can't be trusted: once `free` hands the block back, the allocator may scribble anything over the header, so the freed `refcount` reads as a *random* value rather than a clean zero. The fix is a known sentinel. Add a `magic` field set to `0xDEADBEEF` at creation, zero it just before `free`, and validate it on every access:

```c
void ps_validate(struct pls *p) {
    if (p->magic != 0xDEADBEEF) {
        printf("INVALID STRING: Aborting\n");
        exit(1);
    }
}
```

Now touching a freed (or never-valid) string aborts loudly instead of limping along on corrupted bytes:

```output
INVALID STRING: Aborting
```

Wrap the field in `#ifdef PLS_DEBUG` so production builds drop the extra 4 bytes once the bugs are shaken out.

### A minimal mystring_t

```c:run mystring-refcount
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    size_t len;
    size_t refcount;
    char   data[];
} mystring_t;

mystring_t *str_create(const char *s) {
    size_t len = strlen(s);
    mystring_t *ms = malloc(sizeof(*ms) + len + 1);
    ms->len = len;
    ms->refcount = 1;
    memcpy(ms->data, s, len + 1);
    return ms;
}

void str_incref(mystring_t *ms) { ms->refcount++; }

void str_decref(mystring_t *ms) {
    if (--ms->refcount == 0) {
        printf("freed: \"%s\"\n", ms->data);
        free(ms);
    }
}

int main(void) {
    mystring_t *a = str_create("hello");
    mystring_t *b = a;        /* second alias to the same buffer */
    str_incref(b);            /* refcount = 2 */
    printf("text=%s refcount=%zu\n", a->data, a->refcount);
    str_decref(a);            /* refcount = 1, NOT freed */
    printf("after first decref: refcount=%zu\n", b->refcount);
    str_decref(b);            /* refcount = 0, frees here */
    return 0;
}
```

```output
text=hello refcount=2
after first decref: refcount=1
freed: "hello"
```

The "freed" line fires *once* - the first `decref` is silent because another owner still holds the buffer.

## Modern note

In a single-threaded program `refcount++` and `--refcount` are fine. The moment two threads can touch the same object the counter is a data race - switch to C11 atomics (`_Atomic size_t refcount;` plus `atomic_fetch_add` / `atomic_fetch_sub`). Use `memory_order_acq_rel` on the decrement so the last releaser sees all earlier writes from other owners before it frees the block.

## Try it

1. Call `str_decref(b)` a third time on the freed object - observe the use-after-free; add a `magic` field to catch it.
2. Wrap two `mystring_t *` aliases in a tiny linked list; drop one node, then the other, and confirm the buffer is freed exactly once.

## Cross-reference to K&R

[K&R § 6.4 - Pointers to Structures](../../kr/lessons/06-04-pointers-to-structures.md) introduces `->` and the pattern this lesson uses: a function takes a `struct *` and mutates a field through it. Salvatore's twist is letting the struct own a variable-length tail (`data[]`) so header and payload share one allocation.

## Go deeper

- antirez's [SDS](https://github.com/antirez/sds) - the production version of this idea, used inside Redis. Same header-before-bytes layout, several header sizes chosen by length.
- CPython's [`PyObject`](https://docs.python.org/3/c-api/structures.html#c.PyObject) - every Python value carries an `ob_refcnt`; `Py_INCREF`/`Py_DECREF` are the macros you've just reinvented.

*Click **next →** for design choices in the string library and a tour of `hexdump`.*
