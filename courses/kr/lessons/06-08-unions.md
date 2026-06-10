---
id: 06-08-unions
chapter: 6
label: "6.8"
title: 'Unions'
prev: 06-07-typedef
next: 06-09-bit-fields
status: done
---

A **union** looks like a struct but with a radical difference: all its members **share the same memory**. A union is only large enough to hold its *biggest* member, and at any moment it holds *one* of its members - writing one member overwrites the others, because they occupy the same bytes. Where a struct is "all of these at once" (members side by side), a union is "any one of these, reusing the space." Unions exist to save memory when a value could be one of several types, and to reinterpret the same bytes through different type lenses.

## One storage, many views

```c:run members of a union overlap in memory
#include <stdio.h>

union value {                 /* all three members start at the same address */
    int           i;
    float         f;
    unsigned char b[4];
};

int main(void) {
    union value v;
    v.i = 1;
    printf("sizeof(union) = %zu\n", sizeof v);   /* size of the LARGEST member */

    v.f = 1.0f;               /* overwrites the bytes; now read them raw */
    printf("1.0f bytes: %02x %02x %02x %02x\n", v.b[0], v.b[1], v.b[2], v.b[3]);
    return 0;
}
```

```output
sizeof(union) = 4
1.0f bytes: 00 00 80 3f
```

`sizeof v` is 4 - the size of the largest member (`int`, `float`, and `b[4]` are all 4 bytes), not their sum, because they overlap. After `v.f = 1.0f`, reading `v.b[]` shows the raw bytes of the float `1.0` as the CPU stores them: `00 00 80 3f`. That's the [IEEE-754](https://en.wikipedia.org/wiki/IEEE_754) bit pattern `0x3f800000` for `1.0f`, appearing **little-endian** (least-significant byte first) because this is a little-endian machine. This is *type punning*: the same four bytes viewed as a `float` mean 1.0, viewed as four `unsigned char`s reveal the encoding. (Reading a *different* member than the one last written is technically implementation-defined in C, but the byte-array case shown here is the standard, well-defined way to inspect an object's representation.)

## Tagged unions and what they're for

A union by itself doesn't remember *which* member is currently valid - read the wrong one and you get garbage reinterpreted. So real code pairs a union with a **tag** (an enum saying which member is live), forming a **tagged union** (a.k.a. *variant* or *sum type*): `struct { enum {INT, FLT, STR} kind; union { int i; float f; char *s; } u; }`. You check `kind` before touching `u`, the way an interpreter stores a value that might be a number, string, or list in one compact object. This pattern is everywhere in systems code - token values in a parser, `union sigval`, the many `struct sockaddr_*` variants overlaid through `union`, and message protocols where a header byte selects the payload interpretation. The two reasons to reach for a union: **saving space** (one slot for mutually-exclusive alternatives) and **deliberate reinterpretation** of bytes. The danger is the flip side of the power - nothing stops you reading the wrong member, so always gate access with a tag.

## Go deeper
- [Unions (C)](https://en.cppreference.com/w/c/language/union) - shared storage rules
- [Tagged union](https://en.wikipedia.org/wiki/Tagged_union) - pairing a union with a discriminant
- [Type punning](https://en.wikipedia.org/wiki/Type_punning) - reinterpreting bytes
- [Endianness](https://en.wikipedia.org/wiki/Endianness) - why the bytes appear reversed
