---
id: 06-09-bit-fields
chapter: 6
label: "6.9"
title: 'Bit-fields'
prev: 06-08-unions
next: 07-01-standard-input-and-output
status: done
---

A **bit-field** lets a struct member occupy a chosen number of *bits* rather than whole bytes. You write `unsigned is_keyword : 1;` to declare a one-bit field. The compiler packs several such fields into a single integer-sized storage unit, so a handful of flags and small numbers that would otherwise cost one or more bytes each can share a single `int`. Bit-fields are how C expresses, in readable named-member form, the kind of bit-packing you'd otherwise do with manual shifts and masks.

## Packing flags into one word

```c:run several members sharing the bits of one int
#include <stdio.h>

struct flags {
    unsigned is_keyword : 1;   /* 1 bit  -> 0 or 1            */
    unsigned is_extern  : 1;   /* 1 bit                       */
    unsigned is_static  : 1;   /* 1 bit                       */
    unsigned level      : 5;   /* 5 bits -> 0..31             */
};

int main(void) {
    struct flags f = {0};
    f.is_keyword = 1;
    f.is_static  = 0;
    f.level      = 20;
    printf("keyword=%u static=%u level=%u\n", f.is_keyword, f.is_static, f.level);
    printf("sizeof(struct flags) = %zu\n", sizeof(struct flags));
    return 0;
}
```

```output
keyword=1 static=0 level=20
sizeof(struct flags) = 4
```

The three 1-bit flags plus the 5-bit `level` total just 8 bits, and the whole struct fits in **4 bytes** - one `int`-sized storage unit - instead of the four separate bytes (or more) you'd pay for ordinary members. Each field behaves like a tiny unsigned integer: `level : 5` holds 0–31, so assigning 20 is fine but assigning 40 would silently wrap to fit 5 bits. You read and write them with plain member syntax (`f.level = 20`), and the compiler generates the shifts and masks for you - far more legible than hand-rolling `flags |= KEYWORD; level = (flags >> 3) & 0x1f;`.

## Where they shine, and the fine print

Bit-fields earn their keep when memory is scarce or structures are numerous: compiler symbol tables (the K&R example), file-format and protocol headers, and embedded systems mapping hardware registers where each bit controls a device. They make intent obvious - `is_keyword : 1` says "a boolean flag" far better than a magic mask. But the convenience hides genuinely implementation-defined behavior, which is why portable wire formats often *avoid* bit-fields and use explicit masking instead. The standard doesn't fix the **allocation order** (whether `is_keyword` lands in the low or high bit of the word), nor the packing and **alignment** of units, nor - historically - which types beyond `int`/`unsigned` are allowed; all of these can differ between compilers and architectures. You also **cannot take the address** of a bit-field (`&f.level` is illegal) - they aren't separately addressable, since several share one byte - so they can't be used where a pointer to the member is needed. Treat bit-fields as a compact, readable in-memory convenience, not as a guaranteed byte-exact layout across systems.

This wraps up structures. Next we move to the standard library and **input/output** - reading and writing the world outside your program.

## Go deeper
- [Bit-fields (C)](https://en.cppreference.com/w/c/language/bit_field) - syntax and the implementation-defined parts
- [Bit field](https://en.wikipedia.org/wiki/Bit_field) - the general concept
- [Bit manipulation](https://en.wikipedia.org/wiki/Bit_manipulation) - the shifts and masks bit-fields hide
- [Data structure alignment](https://en.wikipedia.org/wiki/Data_structure_alignment) - why packing and units vary
