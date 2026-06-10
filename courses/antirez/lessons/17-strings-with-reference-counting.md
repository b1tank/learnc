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

Wrap a string in a struct whose header carries a **length** and a **reference count**, immediately followed by the bytes themselves. Sharers bump the counter (`retain`) instead of copying, and only the *last* `release` actually frees the allocation.

## The header struct `[01:17 → 02:36]`

The whole library hangs on one shape:

```c
struct pls {
    uint32_t len;
    uint32_t refcount;
    char     str[];     /* C99 flexible array member */
};
```

The two `uint32_t` fields are naturally aligned: `len` sits at offset 0, `refcount` at offset 4, and the string starts at offset 8. `str[]` is not a separate allocation - it is a *flexible array member* that lives in the same `malloc` block, right after the header. The bytes are reached by walking past those eight header bytes, which is why the constructor allocates `sizeof(struct pls) + len + 1` (header, payload, and one byte for the trailing `\0`).

## Why a refcount at all `[03:12 → 04:34]`

Plain `malloc`/`free` forces a single owner. Refcounting lets several places hold the same string honestly: each owner calls `retain` when it takes a reference and `release` when it lets go. The constructor returns the object with `refcount == 1`, never zero - whoever called the constructor is about to store that reference somewhere, so one is the honest starting count. Start at zero and the first `release` would free an object the caller has just stored.

## retain and release `[07:20 → 12:45]`

The whole protocol is two functions. Both recover the header from the public `char *` by subtracting the header size, then touch the counter:

```c
void ps_retain(char *s) {
    struct pls *p = (struct pls *)(s - sizeof(*p));
    p->refcount++;                 /* a new alias exists */
}

void ps_release(char *s) {
    struct pls *p = (struct pls *)(s - sizeof(*p));
    if (--p->refcount == 0)        /* last owner let go */
        free(p);                   /* free the pointer malloc returned */
}
```

The cast parenthesisation matters: `s` is a `char *`, so `s - sizeof(*p)` subtracts raw bytes (char is one byte), and *only then* is the result cast to `struct pls *`. `free` must be handed the exact pointer `malloc` returned - the start of the header - not the interior `str` pointer the caller holds. The language has no garbage collector; this *is* the collector, written by hand.

## Catching use-after-free with a magic number `[17:07 → 21:46]`

A tempting guard is to check `refcount == 0` on entry to catch a double-release. It cannot be trusted: once `free` hands the block back, the allocator may scribble anything over the header, so the freed `refcount` reads as a *random* value rather than a clean zero. The fix is a known sentinel. Add a `magic` field set to `0xDEADBEEF` at creation, zero it just before `free`, and validate it on every access:

```c:run magic-validate
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PLS_MAGIC 0xDEADBEEFu

struct pls {
    unsigned int magic;
    size_t       refcount;
    char         str[];
};

void ps_validate(struct pls *p) {
    if (p->magic != PLS_MAGIC) {
        printf("INVALID STRING: Aborting\n");
        exit(1);
    }
}

int main(void) {
    struct pls *p = malloc(sizeof *p + 4);
    p->magic = PLS_MAGIC;
    p->refcount = 1;
    memcpy(p->str, "abc", 4);

    ps_validate(p);               /* valid: returns quietly */
    printf("first validate ok\n");

    p->magic = 0;                 /* what release() does just before free() */
    ps_validate(p);               /* now aborts loudly */
    printf("unreachable\n");
    return 0;
}
```

```output
first validate ok
INVALID STRING: Aborting
```

Touching a freed (or never-valid) string now aborts instead of limping along on corrupted bytes. Wrap the field in `#ifdef PLS_DEBUG` so production builds drop the extra four bytes once the bugs are shaken out.

## Sharing a string across two lists `[22:34 → 23:31]`

The payoff shows up when one string is referenced from two structures - say a node in two different linked lists. Insert it on the second list and you call `ps_retain`, so its `refcount` is 2. Remove it from one list with `ps_release` and the counter drops to 1; the bytes stay alive because the other list still owns them. Drop the last reference and it goes to 0 and is freed exactly once. This is still manual memory management, but far safer than scattering `strdup`/`free` pairs and hoping the counts balance.

## A working refcount, end to end

Here is the smallest complete version: a header with `len` and `refcount`, a constructor that starts the count at 1, and `incref`/`decref` that free only at zero. It is fully self-contained, so you can run it and watch the counter move:

```c:run refcount
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
    ms->refcount = 1;              /* constructor owns one reference */
    memcpy(ms->data, s, len + 1);
    return ms;
}

void str_incref(mystring_t *ms) { ms->refcount++; }

void str_decref(mystring_t *ms) {
    if (--ms->refcount == 0) {     /* last owner: free here */
        printf("freed: \"%s\"\n", ms->data);
        free(ms);
    }
}

int main(void) {
    mystring_t *a = str_create("hello");
    mystring_t *b = a;             /* second alias to the same buffer */
    str_incref(b);                 /* refcount = 2 */
    printf("text=%s refcount=%zu\n", a->data, a->refcount);
    str_decref(a);                 /* refcount = 1, NOT freed */
    printf("after first decref: refcount=%zu\n", b->refcount);
    str_decref(b);                 /* refcount = 0, frees here */
    return 0;
}
```

```output
text=hello refcount=2
after first decref: refcount=1
freed: "hello"
```

The output proves the ownership rules. Two owners, count 2. The first `decref` drops the count to 1 and prints *nothing* - `b` still holds the buffer, so freeing would be a bug. Only the second `decref` reaches zero and the `freed:` line fires, exactly once. The rule to internalise: every alias you create must be matched by exactly one `decref`, and the buffer is valid right up until the call that takes the count to zero.
