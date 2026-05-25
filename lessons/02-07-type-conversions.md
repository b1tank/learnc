---
id: 02-07-type-conversions
chapter: 2
label: "2.7"
title: Type Conversions
prev: 02-06-relational-and-logical-operators
next: 02-08-increment-and-decrement-operators
status: done
---

C automatically converts operand types in arithmetic expressions to a common one — the so-called **usual arithmetic conversions**. The rules are deterministic; the surprises come when you forget them.

## The promotion ladder (from narrow to wide)

1. `char` / `short` are first **promoted** to `int` whenever they participate in an arithmetic expression.
2. If either operand is `double`, the other is converted to `double`.
3. Else if either is `float`, the other becomes `float`.
4. Else if either is `long`, the other becomes `long`.
5. Else both are `int`.

Signedness adds wrinkles: when mixing signed and unsigned of the same rank, signed becomes unsigned. This is the cause of the classic bug:

```c
unsigned int u = 1;
int          i = -1;
if (i < u) ... /* nope: -1 is converted to a huge unsigned. The branch is false. */
```

## Narrowing (assignment / cast)

Assigning a wider type to a narrower one truncates. `int x = 3.7;` stores `3` — fractional part discarded. `char c = 300;` keeps the low 8 bits.

Explicit casts make the intent visible:

```c
int    n = 7;
double d = (double) n / 2;     /* 3.5, not 3 */
char   c = (char) 0x1234;      /* 0x34 */
```

## Function calls

In K&R-era C without prototypes, `char`/`short` arguments were promoted to `int` and `float` arguments were promoted to `double` *before being passed*. With ANSI C prototypes, the declared parameter type drives the conversion, exactly like an assignment.

```c:starter
#include <stdio.h>

int main(void) {
    /* widening, implicit */
    int    i = 7;
    double d = i;                /* OK: int -> double */
    printf("int->double: %f\n", d);

    /* truncation on narrowing */
    double pi = 3.7;
    int    truncated = pi;       /* 3 (fractional dropped) */
    printf("double->int (truncated): %d\n", truncated);

    /* signed/unsigned mixing surprise */
    unsigned int u = 1;
    int          s = -1;
    printf("s < u ? (intuitive yes) -> %d\n", s < u);    /* 0! */

    /* explicit cast clears it up */
    printf("(int)u: %d, s: %d, s < (int)u ? %d\n",
           (int)u, s, s < (int)u);                       /* 1 */

    /* char promotion */
    char c = 'A';
    printf("'A' + 1 = %d (int)\n", c + 1);               /* 66 */
    return 0;
}
```

```output
int->double: 7.000000
double->int (truncated): 3
s < u ? (intuitive yes) -> 0
(int)u: 1, s: -1, s < (int)u ? 1
char promotion 'A' + 1 = 66 (int)
```

## A useful idiom — `atoi`-like character to digit

`c - '0'` is the canonical "character digit to its int value" conversion. It works because ASCII places `'0'`…`'9'` consecutively at codes 48…57.

## Modern note

Modern compilers warn loudly about narrowing without an explicit cast and about signed/unsigned comparisons. Compile with `-Wall -Wextra -Wsign-compare` to get them.

For tightly-controlled conversion (e.g. checked numeric casts), use the explicit-width types in `<stdint.h>` and `<inttypes.h>`. They make "this is a 32-bit unsigned integer, period" explicit at the type level.

## Try it

1. Write `int x = 'A' + 'B';`. The result is an `int`, not a string concatenation. Print it.
2. Compare `-1 < (unsigned)1`. The result is false, because `-1` becomes a huge unsigned value when converted. Add `(int)` cast on the rhs and it flips.
3. Write `float f = 1.0 / 3.0;` vs `float f = 1.0f / 3.0f;`. The first computes a `double` then truncates. The second stays in `float`. The values differ in the last few bits.

## Notes from the author

- The signed/unsigned conversion rules are the most common source of "the comparison goes the wrong way" bugs. As a habit: **don't mix signed and unsigned operands**. Pick one signedness for related quantities and stick with it.
- The "char/short promote to int" rule means an expression like `unsigned char a, b; (a + b)` always yields an `int`, even though both operands are 8-bit. This is occasionally surprising in macros and bit manipulation. If you want narrow arithmetic, cast back: `(unsigned char)(a + b)`.
- The "no implicit narrowing without a warning" discipline is the most important conversion habit. Casts cost nothing at runtime and document intent. Use them whenever the compiler would otherwise complain.

*Click **next →** to look at the increment and decrement operators.*
