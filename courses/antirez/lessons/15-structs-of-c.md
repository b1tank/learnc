---
id: 15-structs-of-c
chapter: 6
label: "6.3"
title: The structs of C
prev: 14-hidden-metadata-behind-pointer
next: 16-structs-as-data-structure-bricks
status: draft
source:
  videoId: p4IMHau2lq8
  url: https://www.youtube.com/watch?v=p4IMHau2lq8
---

> **Source video.** [Let's Learn C - lesson 14](https://www.youtube.com/watch?v=p4IMHau2lq8) by Salvatore Sanfilippo (antirez).

## TL;DR

A `struct` glues several named fields under one type, so instead of juggling `f[0]`, `f[1]` you write `f->num`, `f->den`. Reach the fields with `.` on a value and `->` through a pointer - the two operators exist only so the reader can see at a glance which kind of variable they have. The struct itself is laid out with **padding** so every field sits at an address that is a multiple of its size.

## From parallel arrays to a named type `[02:20 → 15:32]`

The motivating example is a fraction. You *can* `malloc(sizeof(int) * 2)` and agree that slot 0 is the numerator and slot 1 the denominator - and then write `set_fraction`, `print_fraction`, `simplify_fraction` that all index `f[0]` and `f[1]`. It works, but every reader has to remember the convention, and adding a third field (say, a sign byte) means renumbering everything.

`struct fract { int num; int den; };` gives the convention a name the compiler can check. Structs are the one place C steps out of "everything is a number" - a `malloc` result is a number, `NULL` is the number zero, an offset is a number, but a struct is a genuine aggregate *data type* you can declare, instantiate, and even return by value.

## A first struct, by value `[22:21]`

You declare a variable of struct type exactly like any other: `struct point p;` mirrors `int a;`. Reach a field with the dot operator and `sizeof` reports the whole aggregate:

```c:run struct-by-value
#include <stdio.h>

struct point { int x, y; };

int main(void) {
    struct point p;
    p.x = 3;
    p.y = 4;
    printf("(%d, %d)\n", p.x, p.y);
    printf("sizeof(struct point) = %zu\n", sizeof(struct point));
    return 0;
}
```

```output
(3, 4)
sizeof(struct point) = 8
```

## `.` vs `->` - same operation, two spellings `[23:08 → 27:11]`

Given `struct point p;` you write `p.x`. Given `struct point *b = &p;` you write `b->x`, which is just sugar for `(*b).x`. C does not let you use `.` on a pointer or `->` on a value - the redundancy is deliberate: when you see `->` you know without scrolling that the left-hand side is a pointer. As Salvatore puts it, C is designed to be explicit, and that one glance is excellent for readability.

## Through a pointer, with `->` `[27:40 → 29:23]`

A function that mutates the struct takes a `struct point *` and uses the arrow. This is the idiomatic shape - passing structs by pointer avoids the implicit byte-by-byte copy you get when returning them by value.

```c:run struct-by-pointer
#include <stdio.h>

struct point { int x, y; };

void shift(struct point *p, int dx, int dy) {
    p->x += dx;
    p->y += dy;
}

int main(void) {
    struct point p = {1, 2};
    shift(&p, 10, 20);
    printf("(%d, %d)\n", p.x, p.y);
    return 0;
}
```

```output
(11, 22)
```

A struct can also be returned *by value*, which is genuinely strange for a language that otherwise only moves numbers around. When you do, C copies the bytes of the returned struct into the destination variable. For two `int`s that is nothing; for a large struct it is real overhead, which is why structs are almost always passed by pointer and allocated on the heap with `malloc`/`free`.

## Padding and alignment `[17:06 → 22:13]`

`sizeof(struct point)` above is 8, exactly what you expect: two 4-byte `int`s. Now insert an `unsigned char color` before them and the size jumps to **12**, not 9 - the compiler inserts three bytes of *padding* so `num` lands at an address that is a multiple of 4. Move the `char` to the end and the size is *still* 12: the struct as a whole is padded up to a multiple of its widest field, so arrays of it stay aligned. You can ask for a `__attribute__((packed))` struct without padding, but the programmer has to request it explicitly and it is rarely worth it.

## Field offsets are fixed at compile time

A struct is really a name for an *offset table*: the compiler decides at compile time where each field sits, and from then on a field access is just "base address plus a constant". The rule from the video - each member lands at an address that is a multiple of its size - is something you can read straight off `offsetof`:

```c:run offsets
#include <stdio.h>
#include <stddef.h>

struct rec {
    unsigned char tag;    /* 1 byte at offset 0, then 3 bytes padding */
    int id;               /* 4 bytes, must start at a multiple of 4   */
    double score;         /* 8 bytes, must start at a multiple of 8   */
};

int main(void) {
    printf("sizeof(struct rec) = %zu\n", sizeof(struct rec));
    printf("offsetof tag   = %zu\n", offsetof(struct rec, tag));
    printf("offsetof id    = %zu\n", offsetof(struct rec, id));
    printf("offsetof score = %zu\n", offsetof(struct rec, score));
    return 0;
}
```

```output
sizeof(struct rec) = 16
offsetof tag   = 0
offsetof id    = 4
offsetof score = 8
```

`tag` sits at 0, then `id` skips to 4 (three padding bytes wasted), then `score` lands at 8. Those constants are burned into the machine code. Compile `int get_y(struct Point *p) { return p->y; }` and the field name has disappeared entirely:

```asm
get_y:
        endbr64
        mov     eax, DWORD PTR 4[rdi]    ; offset 4 = where y lives
        ret
sum:                                     ; return p->x + p->y + p->z
        endbr64
        mov     eax, DWORD PTR 4[rdi]
        add     eax, DWORD PTR [rdi]
        add     eax, DWORD PTR 8[rdi]
        ret
```

`p->y` is literally `[base + 4]` - there is no field lookup at runtime, the offset was already chosen. This is why adding a field to a struct in a shared header is an ABI break: every compiled caller has the old offsets baked in.

## Reordering fields to shrink a struct

Because padding fills the gaps before each aligned field, the *order* you list members in changes the total size. Group the small fields together instead of scattering them between the wide ones and the holes collapse:

```c:run reorder
#include <stdio.h>

struct wasteful {
    char  a;      /* 1 byte, then 3 padding */
    int   b;      /* 4 bytes */
    char  c;      /* 1 byte, then 3 padding */
    int   d;      /* 4 bytes */
};

struct tight {
    int   b;      /* 4 bytes */
    int   d;      /* 4 bytes */
    char  a;      /* 1 byte */
    char  c;      /* 1 byte, then 2 padding */
};

int main(void) {
    printf("sizeof(struct wasteful) = %zu\n", sizeof(struct wasteful));
    printf("sizeof(struct tight)    = %zu\n", sizeof(struct tight));
    return 0;
}
```

```output
sizeof(struct wasteful) = 16
sizeof(struct tight)    = 12
```

Same four fields, same data, four bytes saved - 25% smaller - purely by putting the two `char`s next to each other so they share one padding tail instead of forcing two. In a hot data structure with millions of instances that is the difference between fitting in cache and not.
