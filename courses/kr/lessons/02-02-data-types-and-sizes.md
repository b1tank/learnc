---
id: 02-02-data-types-and-sizes
chapter: 2
label: "2.2"
title: Data Types and Sizes
prev: 02-01-variable-names
next: ex-2-1
status: done
---

C's basic types are thin wrappers over the machine's native word sizes: `char` (one byte, the addressable unit), `short`, `int`, `long` (integers of non-decreasing width), and `float`/`double` ([IEEE‑754](https://en.wikipedia.org/wiki/IEEE_754) floating point). Crucially, the standard only fixes *minimum* sizes and an ordering - exact widths are **implementation-defined**, set by the platform's [data model](https://en.wikipedia.org/wiki/64-bit_computing#64-bit_data_models) (LP64 on 64-bit Linux). Never hard-code a size; ask the compiler with `sizeof`.

## Ask the machine, don't assume

`sizeof` is a compile-time operator that yields the byte size of a type. `<limits.h>` exposes the actual ranges. Here's the ground truth for the WASM target this page runs on:

```c:run measuring the types
#include <stdio.h>
#include <limits.h>

int main(void) {
    printf("CHAR_BIT = %d bits per byte\n", CHAR_BIT);
    printf("char=%zu short=%zu int=%zu long=%zu\n",
           sizeof(char), sizeof(short), sizeof(int), sizeof(long));
    printf("float=%zu double=%zu\n", sizeof(float), sizeof(double));
    printf("int range: %d .. %d\n", INT_MIN, INT_MAX);
    printf("unsigned char max: %d\n", UCHAR_MAX);
    return 0;
}
```

```output
CHAR_BIT = 8 bits per byte
char=1 short=2 int=4 long=4
float=4 double=8
int range: -2147483648 .. 2147483647
unsigned char max: 255
```

`%zu` is the correct format for `sizeof`'s result (`size_t`). On this WebAssembly target `long` is 4 bytes (the ILP32 model - same width as `int`); on a 64-bit native Linux build (LP64) `long` would be 8. That's exactly the point: widths are platform-dependent. `CHAR_BIT` is 8 on every machine you'll meet, but the standard only requires it be *at least* 8 - a reminder that "byte" in C means "smallest addressable unit," not "exactly 8 bits."

## signed vs unsigned, and why it bites

Every integer type has a `signed` and `unsigned` variant. `unsigned` uses all bits for magnitude (range `0 .. 2ⁿ−1`); signed types use [two's complement](https://en.wikipedia.org/wiki/Two%27s_complement), reserving the top bit for sign. `unsigned` arithmetic wraps around modulo 2ⁿ by definition (well-defined); **signed overflow is undefined behavior** the compiler may exploit. When you need an exact width (e.g. a 32-bit network field), use `<stdint.h>`'s `int32_t`/`uint8_t` instead of guessing.

## Go deeper
- [Arithmetic types (C)](https://en.cppreference.com/w/c/language/arithmetic_types) - the full type zoo and guaranteed ranges
- [`<stdint.h>`](https://en.cppreference.com/w/c/types/integer) - fixed-width `intN_t` when you need an exact size
- [IEEE 754](https://en.wikipedia.org/wiki/IEEE_754) - how `float`/`double` actually store numbers
- [64-bit data models (LP64/LLP64)](https://en.wikipedia.org/wiki/64-bit_computing#64-bit_data_models) - why `long` differs across platforms
