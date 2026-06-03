---
id: 02-09-bitwise-operators
chapter: 2
label: "2.9"
title: Bitwise Operators
prev: ex-2-5
next: ex-2-6
status: done
---

Bitwise operators treat an integer as a row of bits and manipulate them directly — the level at which hardware actually thinks. There are six: `&` (AND), `|` (OR), `^` (XOR), `~` (NOT/complement), `<<` (left shift), `>>` (right shift). Each maps to a single CPU instruction. They're the tools for flags, masks, packing several values into one word, and the arithmetic tricks that power graphics, crypto, and protocol code. Always use **`unsigned`** types for bit work so the sign bit and shifts behave predictably.

## The six operators at a glance

```c:run bit twiddling
#include <stdio.h>

int main(void) {
    unsigned a = 0x0F, b = 0x33;
    printf("a    = 0x%02X\n", a);
    printf("b    = 0x%02X\n", b);
    printf("a & b= 0x%02X\n", a & b);          /* bits set in BOTH */
    printf("a | b= 0x%02X\n", a | b);          /* bits set in EITHER */
    printf("a ^ b= 0x%02X\n", a ^ b);          /* bits set in exactly ONE */
    printf("a<<2 = 0x%02X  (multiply by 4)\n", a << 2);
    printf("b>>1 = 0x%02X  (divide by 2)\n", b >> 1);
    printf("~0u (8 low bits) = 0x%02X\n", (~0u) & 0xFF);
    return 0;
}
```

```output
a    = 0x0F
b    = 0x33
a & b= 0x03
a | b= 0x3F
a ^ b= 0x3C
a<<2 = 0x3C  (multiply by 4)
b>>1 = 0x19  (divide by 2)
~0u (8 low bits) = 0xFF
```

The idioms to memorize: `x & MASK` reads selected bits; `x | MASK` sets them; `x & ~MASK` clears them; `x ^ MASK` toggles them; `x & 1` tests the lowest bit (odd/even). Shifting left by `n` multiplies by `2ⁿ`; shifting an unsigned right by `n` divides by `2ⁿ` — both far cheaper than a multiply/divide, which is why compilers turn `x * 8` into `x << 3`.

## `&&` is not `&`

The classic confusion: `&&`/`||` are *logical* (whole-value true/false, short-circuiting), while `&`/`|` are *bitwise* (per-bit, both sides always evaluated). `1 & 2` is `0` (no common bits) but `1 && 2` is `1` (both nonzero). Mixing them up produces code that often works by luck and fails on the one input that exposes it.

A caution on `>>`: right-shifting a *signed* negative number is implementation-defined (it may copy the sign bit). Left-shifting into or past the sign bit of a signed type is undefined. Keep bit manipulation in `unsigned` and these traps vanish.

## Go deeper
- [Bitwise operators (C)](https://en.cppreference.com/w/c/language/operator_arithmetic#Bitwise_logic_operators) — exact semantics and shift rules
- [Bit manipulation](https://en.wikipedia.org/wiki/Bit_manipulation) — common masks and tricks
- [Bit Twiddling Hacks](https://graphics.stanford.edu/~seander/bithacks.html) — the canonical catalogue
- [Two's complement](https://en.wikipedia.org/wiki/Two%27s_complement) — why `~` and signed shifts behave as they do
