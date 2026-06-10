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

> **Source video.** [Let's Learn C - lesson 21](https://www.youtube.com/watch?v=TM4jgODgdFY) by Salvatore Sanfilippo (antirez).

## TL;DR

A `union` overlays several fields at the **same address**, so the storage is reused - perfect for tagged unions and for inspecting an object's raw bytes. A **bitfield** packs several small integers into a single word, useful for flags and on-wire headers. Both pay the price of being sensitive to alignment, endianness, and a handful of "implementation-defined" choices.

## `union`: shared storage `[08:03 → 16:18]`

In a `struct` every field has its own offset; in a `union` every field starts at offset 0, so writing one overwrites the others. That is exactly what you want when an object is *one of* several types at a time - a classic **tagged union**: a discriminator plus a `union` of payload variants. The size becomes the **largest** variant, not the sum. Redis' vector-set evaluator uses this for `ExprToken` (a number *or* a string descriptor *or* an opcode depending on `token_type`) - millions of instances, real savings. An anonymous `union` (no member name) is a C11 convenience; before that you named it and reached through `f.u.i`.

## Reading an int's bytes through a union `[09:33 → 11:20]`

Overlay an `int` and a 4-byte array, write the int, then read the array back to inspect the raw little-endian representation:

```c:run
#include <stdio.h>
#include <limits.h>

union { int i; unsigned char a[4]; } f;

static void dump(void) {
    printf("%d %d %d %d\n", f.a[0], f.a[1], f.a[2], f.a[3]);
}

int main(void) {
    f.i = 10;      dump();
    f.i = INT_MAX; dump();
    f.i = INT_MIN; dump();
    f.i = -1;      dump();
    return 0;
}
```

```output
10 0 0 0
255 255 255 127
0 0 0 128
255 255 255 255
```

`10` lands entirely in the first byte (least-significant first, so this machine is little-endian); `INT_MAX` is `255 255 255 127` with the top bit clear; `INT_MIN` flips just that bit to `0 0 0 128`; `-1` is all-ones, the two's-complement representation. You could get the same view with an `unsigned char *` aimed at `&f.i`; the union is just a tidier way to say "look at these bytes two ways".

## Bitfields: integers measured in bits `[17:00 → 18:40]`

`unsigned char level : 4;` asks the compiler for a 4-bit field. The base type matters: `int a:4; b:4; c:8;` still costs 4 bytes; the same fields on `unsigned char` fit in 1. Use cases: **memory** (Redis' `redisObject` packs `type`, `encoding`, `lru`, `refcount` together) and **wire formats** (the IPv4 header, where `ip_hl` is 4 bits, `version` is 4 bits, and so on).

## Caveats: portability and overflow `[19:11 → 24:13]`

C barely specifies how bitfields are packed across endianness and ABIs - fine for in-memory state, dangerous for serialised data. For a real wire format, prefer `unsigned char[]` plus shifts and masks; it is more work but portable. Assigning 17 to a 4-bit *unsigned* field stores `17 mod 16 = 1`; the same on a *signed* bitfield is **undefined behaviour**, so keep small fields `unsigned`.

## A minimal tagged union

A tagged union is the everyday use: one discriminator field plus a `union` of the payloads. Only the active variant is valid at a time, so the whole object is only as big as its largest member plus the tag.

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

The `union` of `int` and `double` is 8 bytes (the `double`) and the `tag` is 4, with alignment rounding the struct up to 16. With only two variants the union barely pays off, but `ExprToken` has several, and there the saving over storing every variant side by side is exactly why it exists.

## Packing flags into one byte

Bitfields shine when several small values share a word. Here four fields - two booleans, a 4-bit level, and 2 bits of padding - fit in a single byte:

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

    struct ints { int a:4; int b:4; int c:8; };
    printf("sizeof int-bitfields = %zu\n", sizeof(struct ints));
    return 0;
}
```

```output
ready=1 error=0 level=9
sizeof flags = 1
after level=17: level=1
sizeof int-bitfields = 4
```

Three things to read off the output. The whole struct is `1` byte because the base type is `unsigned char` and the bits add up to 8. Writing `17` into the 4-bit `level` keeps only `17 mod 16 = 1`, silently. And the same logical fields on an `int` base (`int a:4; b:4; c:8;`) jump to `4` bytes - the compiler allocates in units of the declared base type, so the layout is **implementation-defined**. Never assume a particular bit order or offset for serialised data; that is what shifts and masks over a byte array are for.
