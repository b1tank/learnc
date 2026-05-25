---
id: 02-09-bitwise-operators
chapter: 2
label: "2.9"
title: Bitwise Operators
prev: 02-08-increment-and-decrement-operators
next: ex-2-6
status: done
---

C exposes the machine's bit-level operators directly. They work on integer types only, never on floating-point.

| Operator | Meaning |
|---|---|
| `&` | bitwise AND |
| `\|` | bitwise OR |
| `^` | bitwise exclusive OR (XOR) |
| `~` | bitwise complement (unary) |
| `<<` | left shift |
| `>>` | right shift |

## Common patterns

**Set a bit:**
```c
x |= (1U << n);     /* turn on bit n */
```

**Clear a bit:**
```c
x &= ~(1U << n);    /* turn off bit n */
```

**Toggle a bit:**
```c
x ^= (1U << n);     /* flip bit n */
```

**Test a bit:**
```c
if (x & (1U << n)) { /* bit n is set */ }
```

**Extract a field:**
```c
value = (x >> shift) & mask;
```

These five idioms cover ~90% of real-world bit-twiddling.

```c:starter
#include <stdio.h>

int main(void) {
    unsigned x = 0xF0;   /* 1111 0000 */
    unsigned y = 0x0F;   /* 0000 1111 */

    printf("x        = 0x%02X (%u)\n",     x,     x);
    printf("y        = 0x%02X (%u)\n",     y,     y);
    printf("x & y    = 0x%02X (%u)\n",     x & y, x & y);
    printf("x | y    = 0x%02X (%u)\n",     x | y, x | y);
    printf("x ^ y    = 0x%02X (%u)\n",     x ^ y, x ^ y);
    printf("~x (8b)  = 0x%02X\n",          (~x) & 0xFF);
    printf("x >> 4   = 0x%02X\n",          x >> 4);
    printf("y << 4   = 0x%02X\n",          y << 4);

    /* flag pattern */
    unsigned flags = 0;
    flags |= (1U << 2);   /* set bit 2 */
    flags |= (1U << 5);   /* set bit 5 */
    printf("flags    = 0b");
    for (int i = 7; i >= 0; --i) putchar((flags >> i) & 1 ? '1' : '0');
    putchar('\n');

    return 0;
}
```

```output
x        = 0xF0 (240)
y        = 0x0F (15)
x & y    = 0x00 (0)
x | y    = 0xFF (255)
x ^ y    = 0xFF (255)
~x (8b)  = 0x0F
x >> 4   = 0x0F
y << 4   = 0xF0
flags    = 0b00100100
```

## Shifts and signedness

For `unsigned` types, `<<` and `>>` are *logical* shifts — zeros fill in from the empty end.

For `signed` types, `>>` may be **arithmetic** (sign-extending, fills with the sign bit) or **logical**, depending on the implementation. Modern compilers on twos-complement machines do arithmetic shift, but the standard doesn't require it. **Use `unsigned` for any bit-level work** and the ambiguity disappears.

Shifting by more than the width of the type is **undefined behaviour**. `unsigned int x = 1; x << 32;` is *not* zero — it's UB.

## Bitwise vs logical

`a & b` is **not** the same as `a && b`:

| | `&` (bitwise) | `&&` (logical) |
|---|---|---|
| Operates on | every bit | the value as a whole |
| Result | combined-bit value | 0 or 1 |
| Short-circuits? | no | yes |

`1 & 2` is `0` (no common bits). `1 && 2` is `1` (both non-zero). The bug of writing `if (flags & FLAG_A & FLAG_B)` when you mean "both flags set" is a classic — you want `if ((flags & FLAG_A) && (flags & FLAG_B))`.

## Modern note

Use `unsigned` types for all bit-twiddling. Use the literal `1U` (not `1`) for shift-amount masks, so the result has unsigned type. For fixed-width hardware-register manipulation, prefer `<stdint.h>` types: `uint32_t`, `uint8_t`.

## Try it

1. Compute `1 << 31` on `unsigned`. Print it as hex; you'll see `0x80000000`.
2. Write a function that counts set bits ("population count") by looping and right-shifting. Then look up `__builtin_popcount` and compare.
3. Pack two bytes into one short: `(unsigned short)((hi << 8) | lo)`. Unpack with `(s >> 8) & 0xFF` and `s & 0xFF`.

## Notes from the author

- The "set/clear/toggle/test/extract" idiom set is worth memorising — almost every embedded driver, file-format parser, and protocol decoder spells out variants of these five lines.
- The `~x` operator returns a *promoted* result (at least `int`-wide), so `~0xFF` is `0xFFFFFF00` on 32-bit, not `0x00`. If you want the 8-bit complement, mask: `(~x) & 0xFF`.
- For 1-bit flags in a struct, **bitfields** (covered in §6.9) are cleaner and self-documenting. Use raw bit manipulation only when you need bit-level control over an external format (headers, registers, packed serialisation).

*Click **next →** to use compound assignment operators.*
