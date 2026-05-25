---
id: 02-05-arithmetic-operators
chapter: 2
label: "2.5"
title: Arithmetic Operators
prev: 02-04-declarations
next: 02-06-relational-and-logical-operators
status: done
---

The arithmetic operators are the ones you'd expect: `+`, `-`, `*`, `/`, plus the modulo `%`. There are also unary `+` and unary `-` for sign.

## Integer vs floating-point division

C overloads `/` and `*` by the operand types. For integers, `/` truncates toward zero (since C99 — pre-C99 the direction was implementation-defined for negatives). For floating-point, `/` is the real division you'd expect.

```c:starter
#include <stdio.h>

int main(void) {
    printf("int division:    7 / 2  = %d\n", 7 / 2);
    printf("int modulo:      7 %% 2  = %d\n", 7 % 2);
    printf("neg int div:    -7 / 2  = %d  (truncated toward 0)\n", -7 / 2);
    printf("neg modulo:     -7 %% 2  = %d  (sign of dividend)\n", -7 % 2);
    printf("float division:  7.0/2.0 = %f\n", 7.0 / 2.0);
    printf("mixed:           7 / 2.0 = %f  (int promoted to double)\n", 7 / 2.0);
    return 0;
}
```

```output
int division:    7 / 2  = 3
int modulo:      7 % 2  = 1
neg int div:    -7 / 2  = -3  (truncated toward 0)
neg modulo:     -7 % 2  = -1  (sign of dividend)
float division:  7.0/2.0 = 3.500000
mixed:           7 / 2.0 = 3.500000  (int promoted to double)
```

## `%` only applies to integers

You cannot write `7.0 % 2.0`. Use `fmod` from `<math.h>` for floating-point remainder.

## Mixing operand types

When operands of different types meet, C promotes the narrower one. `int + double → double + double → double result`. This is **implicit conversion**, covered in detail in §2.7.

## Overflow

Signed integer overflow is **undefined behaviour** in C — the compiler is allowed to assume it never happens, and modern optimisers will exploit that assumption to eliminate "redundant" checks. Don't write code that relies on wraparound for signed types.

For unsigned types, overflow is well-defined: it wraps modulo $2^N$.

## Unary minus

`-x` returns the negation of `x`. Watch out for `INT_MIN`: `-INT_MIN` is itself undefined behaviour because the result doesn't fit in `int`.

## Modern note

- Use **`unsigned`** for "I want wraparound semantics" — for example, hash mixing, modular arithmetic, cyclic counters.
- Use **`int`** (or wider signed) for "this is a count or a coordinate" — get the compiler's help in catching overflow with sanitisers like `-fsanitize=signed-integer-overflow`.

For exact-precision integer arithmetic with overflow detection, GCC and Clang provide `__builtin_add_overflow` and friends. There's no portable standard alternative until C23's `<stdckdint.h>`.

## Try it

1. Print `100 / 3` and `100.0 / 3`. The first is integer division (33); the second is floating point (33.333…).
2. Try `1 / 0`. The compiler may warn at compile time; at runtime it raises SIGFPE (a divide-by-zero signal) on x86. Floating-point `1.0 / 0.0` returns *infinity* — a defined IEEE result.
3. Compute `INT_MAX + 1`. With `-fsanitize=signed-integer-overflow` you'll see a diagnostic; without it the result is "whatever the optimiser felt like that day".

## Notes from the author

- "Integer division truncates toward zero" is the most surprising piece of the arithmetic operators. `-7 / 2 == -3` and `-7 % 2 == -1` (so the identity `(a/b)*b + a%b == a` holds).
- The `%` of dividend-sign convention means `5 % 3 == 2` but `-5 % 3 == -2`. If you want a *non-negative* modulo, `((a % m) + m) % m` is the idiom.
- Floating-point arithmetic is **not associative** because of rounding. `(a + b) + c` is not always `a + (b + c)`. Compilers normally respect the source order; aggressive `-ffast-math` lets them rearrange and you may lose reproducibility.

*Click **next →** to look at relational and logical operators.*
