---
id: 02-02-data-types-and-sizes
chapter: 2
label: "2.2"
title: Data Types and Sizes
prev: 02-01-variable-names
next: ex-2-1
status: done
---

C's built-in numeric types are deliberately vague about their sizes — the language pins down *minimums* and *relationships*, not exact widths. That's a feature for portability and a footgun for everything else.

## The basic types

| Type | Holds | Min size guaranteed |
|---|---|---|
| `char` | a small integer (or character) | 1 byte (≥ 8 bits) |
| `short` | a small integer | ≥ 16 bits |
| `int` | the natural integer for the machine | ≥ 16 bits |
| `long` | a longer integer | ≥ 32 bits |
| `float` | single-precision floating point | usually 32 bits, IEEE-754 |
| `double` | double-precision floating point | usually 64 bits, IEEE-754 |

The guaranteed ordering is `sizeof(char) ≤ sizeof(short) ≤ sizeof(int) ≤ sizeof(long)` and `sizeof(float) ≤ sizeof(double)`. On a typical 64-bit Linux: `int` is 4 bytes, `long` is 8, `float` is 4, `double` is 8.

`char` is signed or unsigned at the compiler's discretion — this catches new C programmers all the time. If signedness matters, write `signed char` or `unsigned char` explicitly.

```c:starter
#include <stdio.h>
#include <limits.h>
#include <float.h>

int main(void) {
    printf("char  is %zu bytes; range [%d, %d]\n",
           sizeof(char), CHAR_MIN, CHAR_MAX);
    printf("short is %zu bytes; range [%d, %d]\n",
           sizeof(short), SHRT_MIN, SHRT_MAX);
    printf("int   is %zu bytes; range [%d, %d]\n",
           sizeof(int), INT_MIN, INT_MAX);
    printf("long  is %zu bytes; range [%ld, %ld]\n",
           sizeof(long), LONG_MIN, LONG_MAX);
    printf("float : ~%d significant digits\n", FLT_DIG);
    printf("double: ~%d significant digits\n", DBL_DIG);
    return 0;
}
```

```output
char  is 1 bytes; range [-128, 127]
short is 2 bytes; range [-32768, 32767]
int   is 4 bytes; range [-2147483648, 2147483647]
long  is 8 bytes; range [-9223372036854775808, 9223372036854775807]
float : ~6 significant digits
double: ~15 significant digits
```

(Numbers on your machine may differ.)

## Qualifiers

`signed` / `unsigned` flip the most-significant bit's meaning. `unsigned int` doubles the positive range and removes negatives. `long long` (C99+) is at least 64 bits.

## Modern note

C99 introduced `<stdint.h>`, which gives you **exact-width** types: `int32_t`, `uint64_t`, `int8_t`, etc. In new code, prefer these when the bit width matters (file formats, hardware registers, network protocols). Use `int` only when you genuinely don't care about the upper bound.

For sizes of objects (array lengths, buffer counts) the right type is `size_t` from `<stddef.h>` — it's unsigned and wide enough to index any object the platform allows.

## Try it

1. Compute `sizeof(int*)` and compare to `sizeof(int)`. On 64-bit Linux you'll see 8 vs 4.
2. Print `(char)200`. Whether it prints positive or negative tells you whether your compiler made `char` signed.
3. Replace `int` with `short` in the §1.2 temperature loop. At what value does it overflow?

## Notes from the author

- The "char is signed-or-not" ambiguity is one of the language's worst design choices. It exists because pre-ANSI compilers disagreed and standardising one way would have broken too much code.
- Floating-point types being IEEE-754 is *almost* universal but not actually mandated by C. A few embedded compilers still use non-IEEE formats. For numerical reproducibility on hosted platforms, `double` is the safe default.
- The relationship `sizeof(char) == 1` is always true *by definition*, even on platforms where a "byte" isn't 8 bits (think DSP chips with 16-bit chars). `CHAR_BIT` from `<limits.h>` tells you how many bits a char actually has.

*Click **next →** to look at constants — literal values in code.*
