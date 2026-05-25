---
id: 06-09-bit-fields
chapter: 6
label: "6.9"
title: 'Bit-fields'
prev: 06-08-unions
next: ex-6-1
status: done
---

A **bit-field** is a struct member that occupies a specified number of bits instead of a whole storage unit. The syntax: a member of integer type followed by `: N` where `N` is the bit count.

```c
struct flags {
    unsigned is_keyword  : 1;
    unsigned is_extern   : 1;
    unsigned is_static   : 1;
    unsigned priority    : 4;     /* 0–15 */
    unsigned reserved    : 9;
};
```

The struct packs `1 + 1 + 1 + 4 + 9 = 16` bits into the smallest storage that fits them. Access is normal struct syntax:

```c
struct flags f = {0};
f.is_keyword = 1;
f.priority   = 7;
```

## A small example

```c:starter
#include <stdio.h>

struct color {
    unsigned r : 5;
    unsigned g : 6;
    unsigned b : 5;
};

int main(void) {
    struct color c;
    c.r = 31;       /* 5 bits: 0..31 */
    c.g = 63;       /* 6 bits: 0..63 */
    c.b = 31;
    printf("white-ish: r=%u, g=%u, b=%u\n", c.r, c.g, c.b);
    printf("sizeof color = %zu\n", sizeof c);

    /* assigning too-big a value silently truncates */
    c.r = 100;          /* 100 = 0b1100100 -> bottom 5 bits = 0b00100 = 4 */
    printf("after r=100: r=%u\n", c.r);
    return 0;
}
```

```output
white-ish: r=31, g=63, b=31
sizeof color = 4
white-ish: r=31, g=63, b=31
after r=100: r=4
```

## Where bit-fields shine

1. **Hardware registers**: a 16-bit device register might pack 8 different flags. A struct of bit-fields documents the layout and gives natural access.
2. **Compact in-memory representations**: an RGB565 pixel, a flag-heavy tag, a packed protocol header.
3. **Self-documenting "this many bits" constraints**: `unsigned x : 4` says "x has 4 bits of state".

## Where bit-fields are awful

1. **Layout is implementation-defined**. The order of bit-fields within a storage unit (big-endian first or little-endian first) varies by compiler and target. NOT portable for on-the-wire protocols.
2. **No address**: you cannot take `&f.priority`. You can't pass it to a function by pointer.
3. **Compiler can be sloppy**: read-modify-write on a bit-field may involve loading the whole storage unit, masking, and writing back — multiple instructions instead of one.

For network protocols and binary file formats, **don't use bit-fields**. Use explicit shifts and masks:

```c
uint16_t pixel;
uint8_t r = (pixel >> 11) & 0x1F;
uint8_t g = (pixel >>  5) & 0x3F;
uint8_t b = (pixel      ) & 0x1F;
```

This is portable, predictable, and the optimiser knows what to do with it.

## Bit-fields and unions: a useful pair

```c
union register {
    uint16_t raw;
    struct {
        uint16_t enable    : 1;
        uint16_t mode      : 3;
        uint16_t addr      : 12;
    } f;
};
```

Now you can read/write `r.raw` to talk to hardware, and `r.f.mode = 2;` for ergonomic access. Just remember the layout caveat — this is only safe when you control the compiler and target.

## Try it

1. Print `sizeof` for `struct flags` defined above. Does it equal 2 (16 bits) or 4 (rounded to int)?
2. Try `unsigned x : 0;` — what does it mean? (Hint: it forces alignment to the next storage unit.)
3. Define a struct with a `1`-bit field that you store `-1` into. What do you read back?

## Notes from the author

- The K&R discussion of bit-fields is honest about their portability problems. The advice has aged well: use them for hardware/memory-tight scenarios, never for cross-platform binary formats.
- The "signed bit-field" trap: `signed x : 1` can only hold `0` and `-1`, not `0` and `1`. Most code uses `unsigned` bit-fields exclusively.
- Modern alternatives — `_BitInt(N)` (C23), or just explicit shifts — give the same density without the portability gotchas. Bit-fields remain useful for documentation and embedded register definitions.

🎉 You've finished the structures chapter. Six exercises follow that exercise these patterns: building, traversing, hashing, and packing structured data.

*Click **next →** for exercise 6-1.*
