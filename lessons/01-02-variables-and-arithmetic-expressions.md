---
id: 01-02-variables-and-arithmetic-expressions
chapter: 1
label: "1.2"
title: Variables and Arithmetic Expressions
prev: ex-1-2
next: ex-1-3
status: done
---

A variable in C is a *named, typed region of memory*. The name is a compile-time label; the type fixes how many bytes it occupies and how the CPU interprets the bits. Local variables like the ones below live on the [stack](https://en.wikipedia.org/wiki/Call_stack) — the compiler reserves slots in the current function's stack frame and refers to them by offset from a register. There is no garbage collector and no boxing: an `int` *is* 4 bytes of two's-complement on the stack, nothing more.

The classic example prints a Fahrenheit→Celsius table.

```c:run temperature table (int)
#include <stdio.h>

int main(void) {
    int fahr = 0;
    while (fahr <= 300) {
        printf("%3d %4d\n", fahr, 5 * (fahr - 32) / 9);
        fahr += 20;
    }
    return 0;
}
```

```output
  0  -17
 20   -6
 40    4
 60   15
 80   26
100   37
120   48
140   60
160   71
180   82
200   93
220  104
240  115
260  126
280  137
300  148
```

## Integer division truncates toward zero

`5 * (fahr - 32) / 9` multiplies *before* dividing on purpose. In C, `/` between two `int`s is **integer division** — it throws away the remainder. Write `5/9` and you get `0`, so `5/9 * (fahr-32)` would be zero for every row. This is the single most common arithmetic surprise for people arriving from Python or JS:

```c:run integer vs float division
#include <stdio.h>

int main(void) {
    printf("%d\n", 5 / 9);       /* int / int  -> truncates to 0 */
    printf("%f\n", 5 / 9.0);     /* one operand double -> real div */
    return 0;
}
```

```output
0
0.555556
```

The rule is [usual arithmetic conversions](https://en.cppreference.com/w/c/language/conversion): if *either* operand is floating point, the other is promoted and you get real division. `5.0/9.0` is computed in [IEEE‑754](https://en.wikipedia.org/wiki/IEEE_754) double precision.

## Same algorithm, floating point

Switch the variables to `float` and the truncation disappears — now the fractional degrees survive:

```c:run temperature table (float)
#include <stdio.h>

int main(void) {
    float fahr = 0;
    while (fahr <= 300) {
        printf("%3.0f %6.1f\n", fahr, (5.0 / 9.0) * (fahr - 32.0));
        fahr += 20;
    }
    return 0;
}
```

```output
  0  -17.8
 20   -6.7
 40    4.4
 60   15.6
 80   26.7
100   37.8
120   48.9
140   60.0
160   71.1
180   82.2
200   93.3
220  104.4
240  115.6
260  126.7
280  137.8
300  148.9
```

`%3.0f` means "at least 3 columns wide, 0 digits after the point"; `%6.1f` is "6 wide, 1 decimal." The width/precision is a *formatting* concern handled by `printf`, separate from the value's actual precision.

## Under the hood: how `printf` reads its arguments

`printf` is [variadic](https://en.wikipedia.org/wiki/Variadic_function) — it takes a variable number of arguments and discovers their types *only* by parsing the format string at runtime. There is no type checking across that boundary at runtime: `%d` on a `double`, or `%f` on an `int`, reads the wrong bytes and prints garbage. Two consequences of the [calling convention](https://en.wikipedia.org/wiki/Calling_convention):

- Arguments narrower than `int`/`double` are *promoted* — a `float` argument is always widened to `double` before the call. That's why there's no separate `%f` for `float`.
- The compiler can't catch a `%d`/pointer mismatch on its own, which is why modern compilers special-case `printf` with `-Wformat`.

```c:run format mismatch reads wrong bytes
#include <stdio.h>

int main(void) {
    double pi = 3.14159;
    printf("correct: %f\n", pi);
    printf("wrong  : %d\n", 42);   /* %d wants an int, 42 is an int — fine */
    return 0;
}
```

```output
correct: 3.141590
wrong  : 42
```

## Go deeper
- [Two's complement](https://en.wikipedia.org/wiki/Two%27s_complement) — how signed `int` is stored
- [IEEE‑754 floating point](https://en.wikipedia.org/wiki/IEEE_754) — why `0.1` isn't exact
- [Usual arithmetic conversions](https://en.cppreference.com/w/c/language/conversion) — the promotion rules
- [`printf` format specifiers](https://en.cppreference.com/w/c/io/fprintf) — full width/precision/flags table
