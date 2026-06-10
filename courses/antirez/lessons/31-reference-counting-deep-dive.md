---
id: 31-reference-counting-deep-dive
chapter: 9
label: "9.7"
title: Deep-dive on reference counting
prev: 30-toy-forth-function-registration
next: 32-variadic-functions
status: draft
source:
  videoId: QdZc1JV_oCw
  url: https://www.youtube.com/watch?v=QdZc1JV_oCw
---

> **Source video.** [Let's Learn C - deep dive on reference counting](https://www.youtube.com/watch?v=QdZc1JV_oCw) by Salvatore Sanfilippo (antirez).

## TL;DR

Reference counting attaches a small integer to every shared object: each new pointer to it bumps the count, each dropped pointer decrements, and the free happens the instant the count hits zero. The cost is one counter per object plus discipline at every assignment; the reward is deterministic destruction (no GC pause) and no need to scan the program to decide when something is dead. Two caveats follow you forever: cycles leak, and shared refcounts across threads must be atomic.

## Why bother, if you still call `release`? `[02:17 → 03:02]`

The objection in the video: "If I have to call `release` anyway, why not just `free`?" Because an allocation often outlives its creator and lives in several places at once - on Toy Forth's stack, as a function name in the dictionary, inside another heap object. Without refcounts you would need a `free_if_safe(p)` that scans every container to prove `p` is dead - that is an O(N) garbage collector, and a bad one. The refcount turns that O(N) decision into O(1): you never ask "is anyone still using this?", you just keep a running tally.

## The single-owner case does not need it `[04:14 → 05:42]`

If a buffer is allocated, used, and freed inside one function - never aliased - refcounting is pure overhead. Use plain `malloc`/`free`. Reach for refcounts only when an object can be shared: pushed onto a stack while also being stored in a dictionary, returned from a function while still held by the caller, and so on. Salvatore designs Toy Forth this way on purpose: strings and other shareable values are refcounted; the internal arrays that hold them are owned by exactly one object, so they are not.

## The ownership rule `[06:57 → 08:23]`

Memorise this single sentence and most bugs vanish: **every new pointer to the object is a `retain`/`incref`; every pointer you stop using is a `release`/`decref`.** That is the entire contract. The free is automatic - you never call it directly. (Redis spells these `incrRefCount`/`decrRefCount`; `retain`/`release` is the shorter naming Salvatore prefers - same operation either way.) A function that only "borrows" a pointer for the duration of a call does nothing; a function that "stores" it must `retain`; the caller of a constructor owns the initial reference and must eventually `release`.

## What refcounting buys you vs. a tracing GC `[09:35 → 10:17]`

- **Memory.** One counter per object (often 4 or 8 bytes) - sometimes more than the object itself.
- **Determinism.** Destruction happens now, at the `decref` that hits zero, not at some future GC pause. Destructors fire in a predictable order - critical for files, sockets, locks.
- **Cycles.** A tracing GC reclaims `a → b → a`; pure refcounting cannot, because neither count ever reaches zero. Real systems pair refcounts with a cycle collector (CPython) or programmer-managed weak references (`shared_ptr` + `weak_ptr`).
- **Threads.** If two threads can hold the same object, the counter has to be atomic (`_Atomic int`, or a `fetch_add` intrinsic). Non-atomic increments race and leak or double-free.

## A shared object with two owners

Here is the whole mechanism in one runnable: a heap string with a counter, a `retain` that bumps it, and a `release` that decrements and frees only at zero. Two variables own the same object; each releases once; the free fires on the second release.

```c:run
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int   refcount;
    char *data;
} RCStr;

RCStr *rc_new(const char *s) {
    RCStr *r = malloc(sizeof *r);
    r->refcount = 1;
    r->data = malloc(strlen(s) + 1);
    strcpy(r->data, s);
    printf("new    '%s' rc=%d\n", r->data, r->refcount);
    return r;
}

RCStr *rc_retain(RCStr *r) {
    r->refcount++;
    printf("retain '%s' rc=%d\n", r->data, r->refcount);
    return r;
}

void rc_release(RCStr *r) {
    r->refcount--;
    printf("release '%s' rc=%d\n", r->data, r->refcount);
    if (r->refcount == 0) {
        printf("freed  '%s'\n", r->data);
        free(r->data);
        free(r);
    }
}

int main(void) {
    RCStr *owner_a = rc_new("hello");
    RCStr *owner_b = rc_retain(owner_a);  /* a second owner of the same object */
    rc_release(owner_a);                  /* a drops its reference */
    rc_release(owner_b);                  /* b drops the last reference -> freed */
    return 0;
}
```

```output
new    'hello' rc=1
retain 'hello' rc=2
release 'hello' rc=1
release 'hello' rc=0
freed  'hello'
```

Every `retain` is paired with exactly one `release`; the free is a side-effect of the last `release`, never an explicit call. Forget one `release` and the "freed" line disappears - that is a leak. Add a stray `retain` and the count climbs forever and the free never fires.

## Why a cycle leaks

Refcounting's blind spot is a cycle: two objects that reference each other. Each holds the other's count at 1, so when you drop your external handles the counts settle at 1 - never zero - and neither is ever freed. The program below builds `a → b` and `b → a`, then lets go of both:

```c:run
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int          refcount;
    const char  *name;
    struct Node *other;   /* this node holds a reference to another node */
} Node;

Node *node_new(const char *name) {
    Node *n = malloc(sizeof *n);
    n->refcount = 1;
    n->name = name;
    n->other = NULL;
    return n;
}

Node *retain(Node *n) { n->refcount++; return n; }

void release(Node *n) {
    n->refcount--;
    printf("release %s -> rc=%d\n", n->name, n->refcount);
    if (n->refcount == 0) {
        printf("freed %s\n", n->name);
        free(n);
    }
}

int main(void) {
    Node *a = node_new("a");
    Node *b = node_new("b");
    a->other = retain(b);   /* a references b: b rc=2 */
    b->other = retain(a);   /* b references a: a rc=2 */
    release(a);             /* drop our external handle on a */
    release(b);             /* drop our external handle on b */
    printf("a rc=%d, b rc=%d (cycle leaked)\n", a->refcount, b->refcount);
    return 0;
}
```

```output
release a -> rc=1
release b -> rc=1
a rc=1, b rc=1 (cycle leaked)
```

No "freed" line ever prints. The two nodes keep each other alive forever - the textbook reference-counting leak. The fixes are the ones the video hints at: a separate cycle collector (CPython runs one periodically) or a weak reference that points at an object without bumping its count (`std::weak_ptr`, Swift/ARC `weak`). In all of them the rule still holds - new pointer means retain, lost pointer means release - the cycle breaker just opts one edge out of the counting.
