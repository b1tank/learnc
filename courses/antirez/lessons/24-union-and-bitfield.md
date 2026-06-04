---
id: 24-union-and-bitfield
chapter: 8
label: "8.5"
title: union and bitfield
prev: 23-libc-buffering-and-mmap
next: 25-function-pointers
status: draft
source:
  videoId: TM4jgODgdFY
  url: https://www.youtube.com/watch?v=TM4jgODgdFY
---

> **Source video.** [Let's Learn C — lesson 21](https://www.youtube.com/watch?v=TM4jgODgdFY) by Salvatore Sanfilippo (antirez).

## TL;DR

A `union` overlays several fields at the **same address**, so the storage is reused — perfect for tagged unions and for inspecting an object's raw bytes. A **bitfield** packs several small integers into a single word, useful for flags and on-wire headers. Both pay the price of being sensitive to alignment, endianness, and a handful of "implementation-defined" choices.

## Walkthrough

### `union`: shared storage `[08:03 → 16:18]`

In a `struct` every field has its own offset; in a `union` every field starts at offset 0, so writing one overwrites the others. That is exactly what you want when an object is *one of* several types at a time — a classic **tagged union**: a discriminator plus a `union` of payload variants. The size becomes the **largest** variant, not the sum. Redis' vector-set evaluator uses this for `ExprToken` (a number *or* a string descriptor *or* an opcode depending on `token_type`) — millions of instances, real savings.

### Bitfields: integers measured in bits `[17:00 → 18:40]`

`unsigned char level : 4;` asks the compiler for a 4-bit field. The base type matters: `int a:4; b:4; c:8;` still costs 4 bytes; the same fields on `unsigned char` fit in 1. Use cases: **memory** (Redis' `redisObject` packs `type`, `encoding`, `lru`, `refcount` together) and **wire formats** (the IPv4 header).

### Caveats: portability and overflow `[19:11 → 24:13]`

C barely specifies how bitfields are packed across endianness and ABIs — fine for in-memory state, dangerous for serialised data (for real wire formats, prefer `unsigned char[]` plus shifts and masks). Assigning 17 to a 4-bit *unsigned* field stores `17 mod 16 = 1`; the same on a *signed* bitfield is **undefined behaviour**, so keep small fields `unsigned`.

### A minimal tagged union

```c:run
#include <stdio.h>

struct value {
    int tag;            /* 0 = int, 1 = double */
    union {
        int    i;
        double d;
    } u;
};

static void show(const struct value *v) {
    if (v->tag == 0) printf("int: %d\n", v->u.i);
    else             printf("dbl: %.2f\n", v->u.d);
}

int main(void) {
    struct value a = { .tag = 0, .u.i = 42 };
    struct value b = { .tag = 1, .u.d = 3.14 };
    show(&a);
    show(&b);
    printf("sizeof value = %zu\n", sizeof(struct value));
    return 0;
}
```

```output
int: 42
dbl: 3.14
sizeof value = 16
```

### Flags packed in one byte

```c:run
#include <stdio.h>

struct flags {
    unsigned char ready : 1;
    unsigned char error : 1;
    unsigned char level : 4;
    unsigned char _pad  : 2;
};

int main(void) {
    struct flags f = {0};
    f.ready = 1;
    f.level = 9;
    printf("ready=%u error=%u level=%u\n", f.ready, f.error, f.level);
    printf("sizeof flags = %zu\n", sizeof f);

    unsigned over = 17;          /* runtime value: 17 mod 16 = 1 */
    f.level = over;
    printf("after level=17: level=%u\n", f.level);
    return 0;
}
```

```output
ready=1 error=0 level=9
sizeof flags = 1
after level=17: level=1
```

## Modern note

C99 added **designated initialisers** (`.tag = 0, .u.i = 42`); C11 added **anonymous unions**, letting you drop the intermediate `u` and write `v.i` directly. For a single flag, `_Bool` / `<stdbool.h>` is cleaner than a 1-bit bitfield — but bitfields still win when you pack several together.

## Try it

1. Add a `char *s` variant to `struct value` with `tag = 2` and print it. Does `sizeof(struct value)` change? Why?
2. Change the bitfield base type from `unsigned char` to `unsigned int`. What does `sizeof flags` become, and why?
3. Drop `_pad : 2`. Same size? (Compilers round up to the base type.)

## Cross-reference to K&R

- [K&R § 6.8 — Unions](../../kr/lessons/06-08-unions.md)
- [K&R § 6.9 — Bit-fields](../../kr/lessons/06-09-bit-fields.md)

K&R presents both features as modern C still uses them; Salvatore adds the *why* with real Redis examples (`ExprToken`, `redisObject`) and the portability caveats.

## Go deeper

- [`man 7 ip`](https://man7.org/linux/man-pages/man7/ip.7.html) — the IPv4 header, the canonical bitfield wire-format example.
- Redis' `redisObject` in [`server.h`](https://github.com/redis/redis/blob/unstable/src/server.h) — production-grade `type`/`encoding`/`refcount` bitfields.
- Type punning: prefer `memcpy` between same-sized types over a `union` cast — same codegen, strict-aliasing-safe.
- [Eric Raymond, *The Lost Art of C Structure Packing*](http://www.catb.org/esr/structure-packing/).
