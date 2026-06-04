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

> **Source video.** [Let's Learn C — deep dive on reference counting](https://www.youtube.com/watch?v=QdZc1JV_oCw) (originally *Corso di programmazione in C — approfondimento sul reference counting*) by Salvatore Sanfilippo.

## TL;DR

Reference counting attaches a small integer to every shared object: each new pointer to it bumps the count, each dropped pointer decrements, and the free happens *the instant the count hits zero*. The cost is one counter per object plus discipline at every assignment; the rewards are deterministic destruction (no GC pause) and no need to scan the program to decide when something is dead. Two caveats follow you forever: **cycles leak**, and **shared mutable refcounts in threads must be atomic**.

## Walkthrough

### Why bother, if you still call `release`? `[02:17 → 03:02]`

The objection in the video: "If I have to call `release` anyway, why not just `free`?" Because an allocation often outlives its creator and lives in several places at once — on Toy Forth's stack, as a function name in the dictionary, inside another heap object. Without refcounts you'd need a `free_if_safe(p)` that scans every container to prove `p` is dead — that's an O(N) garbage collector, and a bad one. The refcount turns that O(N) decision into O(1).

### The single-owner case doesn't need it `[04:14 → 05:42]`

If a buffer is allocated, used, and freed inside one function — never aliased — refcounting is pure overhead. Use plain `malloc`/`free`. Reach for refcounts only when an object can be **shared**: pushed onto a stack while also being stored in a dictionary, returned from a function while still held by the caller, etc. Salvatore designs Toy Forth this way on purpose: strings and other shareable values are refcounted; the internal arrays that hold them are not.

### The ownership rule `[06:57 → 08:23]`

Memorise this single sentence and most bugs vanish: **every new pointer to the object is a `retain`/`incref`; every pointer you stop using is a `release`/`decref`.** That's the entire contract. The free is automatic — you never call it directly. Library APIs make this explicit: a function that "borrows" a pointer for the duration of the call does nothing; a function that "stores" it must `retain`; the caller of a constructor owns the initial reference and must eventually `release`.

### What refcounting buys you vs. a tracing GC `[09:35 → 10:17]`

- **Memory.** One counter per object (often 4 or 8 bytes) — sometimes more than the object itself.
- **Determinism.** Destruction happens *now*, at the `decref` that hits zero, not at some future GC pause. Destructors fire in a predictable order — critical for files, sockets, locks.
- **Cycles.** A tracing GC reclaims `a → b → a`; pure refcounting can't, because neither count ever reaches zero. Real systems pair refcounts with either a cycle collector (CPython) or weak references the programmer manages (`shared_ptr` + `weak_ptr`).
- **Threads.** If two threads can hold the same object, the counter has to be atomic (`_Atomic int`, or a `fetch_add` intrinsic). Non-atomic increments race and leak or double-free.

## A tiny refcounted string

```c:run
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int   refcount;
    char *data;
} RCStr;

RCStr *rc_new(const char *s) {
    RCStr *r = malloc(sizeof(*r));
    r->refcount = 1;
    r->data = malloc(strlen(s) + 1);
    strcpy(r->data, s);
    printf("new    '%s' rc=%d\n", r->data, r->refcount);
    return r;
}

RCStr *rc_incref(RCStr *r) {
    r->refcount++;
    printf("incref '%s' rc=%d\n", r->data, r->refcount);
    return r;
}

void rc_decref(RCStr *r) {
    r->refcount--;
    printf("decref '%s' rc=%d\n", r->data, r->refcount);
    if (r->refcount == 0) {
        printf("freed  '%s'\n", r->data);
        free(r->data);
        free(r);
    }
}

int main(void) {
    RCStr *a = rc_new("hello");
    RCStr *b = rc_incref(a);   /* share */
    rc_decref(b);              /* drop one ref */
    rc_decref(a);              /* last ref → freed */
    return 0;
}
```

```output
new    'hello' rc=1
incref 'hello' rc=2
decref 'hello' rc=1
decref 'hello' rc=0
freed  'hello'
```

Every `incref` is paired with exactly one `decref`; the free is a side-effect of the last `decref`, not an explicit call.

## Modern note

The same machinery shows up everywhere:

- **C++** — `std::shared_ptr<T>` is refcounting with an atomic counter; `std::weak_ptr<T>` is the cycle-breaker (a non-owning reference that doesn't bump the count).
- **CPython** — every `PyObject` carries a refcount; a separate generational *cycle collector* runs occasionally to catch unreachable cycles.
- **Apple's ARC** (Objective-C, Swift) — the compiler inserts `retain`/`release` calls for you at every assignment; `weak` declarations break cycles.

In all three, the rule from the video — *new pointer ⇒ retain, lost pointer ⇒ release* — is exactly what's happening, just inserted by the compiler or hidden behind a smart-pointer template.

## Try it

1. Forget one `rc_decref` in `main` and re-run. The "freed" line disappears — that's a leak.
2. Add a second `rc_incref(a)` without a matching `decref`. Watch the count climb and the free never fire.
3. Replace `int refcount;` with `_Atomic int refcount;` and `r->refcount++` with `atomic_fetch_add(&r->refcount, 1)`. Same output, but now thread-safe.

## Cross-reference to K&R

[K&R § 6.4 — Pointers to Structures](../../kr/lessons/06-04-pointers-to-structures.md) introduces the mechanics of putting pointers into structs — the prerequisite for any shared, heap-allocated object. K&R stops there; refcounting is the *policy* you wrap around those pointers once you start sharing them across the program.

## Go deeper

- **Cycle problem & solutions.** Bacon & Rajan, *Concurrent Cycle Collection in Reference Counted Systems* (2001) — the algorithm behind CPython's cycle collector.
- **Python in practice.** `import gc; gc.collect()` and `sys.getrefcount(obj)` — poke at a real refcount + cycle collector pair.
- **Redis SDS & object system.** `src/object.c` in [redis/redis](https://github.com/redis/redis) — the production version of the toy here, with `incrRefCount` / `decrRefCount` and shared integer objects.

*Click **next →** to meet variadic functions and `va_list`.*
