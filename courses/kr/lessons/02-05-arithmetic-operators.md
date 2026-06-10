---
id: 02-05-arithmetic-operators
chapter: 2
label: "2.5"
title: Arithmetic Operators
prev: 02-04-declarations
next: 02-06-relational-and-logical-operators
status: done
---

The binary arithmetic operators are `+`, `-`, `*`, `/`, and `%` (modulus). They look like school math, but the machine reality has sharp edges: `/` between two integers does **integer division** - it discards the fractional part - and `%` gives the remainder. The CPU computes both with a single `idiv` instruction that produces quotient and remainder together. `%` doesn't apply to floating point.

## Integer division truncates; the operand types decide everything

```c:run division and remainder
#include <stdio.h>

int main(void) {
    printf("7 / 2  = %d  (integer division truncates toward 0)\n", 7 / 2);
    printf("7 %% 2  = %d  (remainder)\n", 7 % 2);
    printf("-7 / 2 = %d\n", -7 / 2);
    printf("-7 %% 2 = %d  (sign follows the dividend)\n", -7 % 2);
    printf("7.0 / 2 = %g  (one float operand -> float division)\n", 7.0 / 2);
    return 0;
}
```

```output
7 / 2  = 3  (integer division truncates toward 0)
7 % 2  = 1  (remainder)
-7 / 2 = -3
-7 % 2 = -1  (sign follows the dividend)
7.0 / 2 = 3.5  (one float operand -> float division)
```

The single most common beginner bug lives here: `int avg = sum / count;` silently drops the fraction. If you want a real average, at least one operand must be floating: `(double)sum / count`. The *types* of the operands - not the type you assign into - choose integer vs floating division.

## Truncation and the modulo sign

Since C99, integer division truncates **toward zero**, so `-7 / 2` is `-3` (not `-4`), and `%` is defined so that `(a/b)*b + a%b == a` always holds - which forces `a % b` to take the sign of `a`. That's why `-7 % 2` is `-1`, not `+1`. If you need a always-non-negative remainder (for hashing into a table, say), write `((a % n) + n) % n`.

There is no exponentiation operator in C - `x * x` for squaring, or `pow()` from `<math.h>` for the general case. Overflow of signed integer arithmetic is *undefined behavior*; the result isn't merely wrong, the compiler is licensed to assume it never happens.

## Go deeper
- [Arithmetic operators (C)](https://en.cppreference.com/w/c/language/operator_arithmetic) - exact semantics of each
- [Integer division & modulo (C99 truncation)](https://en.wikipedia.org/wiki/Modulo) - sign rules across languages
- [Usual arithmetic conversions](https://en.cppreference.com/w/c/language/conversion) - how mixed-type operands get a common type
- [Integer overflow](https://en.wikipedia.org/wiki/Integer_overflow) - why signed overflow is UB
