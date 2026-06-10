---
id: 02-07-type-conversions
chapter: 2
label: "2.7"
title: Type Conversions
prev: ex-2-2
next: ex-2-3
status: done
---

When an operator sees operands of different types, C silently converts them to a common type before computing - the **usual arithmetic conversions**. Mostly this does what you want (mixing `int` and `double` promotes the `int`), but the rules around `char`, signedness, and narrowing hide some of C's most notorious bugs. Understanding them is the difference between code that "works on my machine" and code that's actually correct.

## Promotion, signed/unsigned, and truncation in one demo

```c:run conversions, helpful and harmful
#include <stdio.h>

int main(void) {
    char c = 'A';
    printf("'A' + 1 = %d -> '%c'\n", c + 1, c + 1);   /* char promoted to int */

    int neg = -1;
    unsigned u = neg;                /* -1 reinterpreted as a huge unsigned */
    printf("(unsigned)-1 = %u\n", u);
    printf("-1 < 1u ? %d  (compared AS unsigned!)\n", -1 < 1u);

    double d = 3.99;
    printf("(int)3.99 = %d  (toward zero, not rounded)\n", (int)d);
    return 0;
}
```

```output
'A' + 1 = 66 -> 'B'
(unsigned)-1 = 4294967295
-1 < 1u ? 0  (compared AS unsigned!)
(int)3.99 = 3  (toward zero, not rounded)
```

Three lessons in one block. **(1)** `char` always promotes to `int` in expressions, so character arithmetic is integer arithmetic. **(2)** When you mix signed and unsigned of the same width, the signed value is converted to unsigned - so `-1 < 1u` is **false**, because `-1` becomes `4294967295`. This single rule causes countless `for (i = 0; i < some_unsigned_count - 1; ...)` infinite loops. **(3)** Casting `double` to `int` truncates toward zero; it does not round.

## Implicit vs explicit, and integer promotion

Conversions happen automatically (implicitly) at assignments, function arguments, and mixed-type operators. You can force one with a **cast**, `(type)expr`, which says "I know what I'm doing." Narrowing conversions (`double`→`int`, `int`→`char`) lose information and should usually be explicit so the intent is visible. The underlying machine model: widening a signed integer sign-extends (copies the sign bit); narrowing just keeps the low bytes; signed↔unsigned of the same width is a pure reinterpretation of the same bits.

## Go deeper
- [Implicit conversions (C)](https://en.cppreference.com/w/c/language/conversion) - the full usual-arithmetic-conversion rules
- [Integer promotion](https://en.cppreference.com/w/c/language/conversion#Integer_promotions) - why `char`/`short` become `int`
- [Two's complement](https://en.wikipedia.org/wiki/Two%27s_complement) - why `-1` is all-ones as unsigned
- [Signedness bugs](https://wiki.sei.cmu.edu/confluence/display/c/INT02-C.+Understand+integer+conversion+rules) - CERT guidance on conversion pitfalls
