---
id: 02-10-assignment-operators-and-expressions
chapter: 2
label: "2.10"
title: Assignment Operators and Expressions
prev: ex-2-8
next: ex-2-9
status: done
---

In C, **assignment is an expression**, not just a statement — `x = 5` has a value (5) as well as the side effect of storing it. That's what lets you write `a = b = c = 0` (assignment is right-associative) or fold an assignment into a condition like `while ((c = getchar()) != EOF)`. C also offers compound assignment operators — `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, `>>=` — where `x op= y` means `x = x op (y)`, evaluating `x` only once.

## Compound assignment in action

```c:run op-assign and a bit-count trick
#include <stdio.h>

/* count 1-bits by clearing the lowest set bit each pass: x &= (x-1) */
int bitcount(unsigned x) {
    int n = 0;
    while (x != 0) {
        x &= (x - 1);   /* turn off the rightmost 1 */
        n++;
    }
    return n;
}

int main(void) {
    int n = 10;
    n += 5;  printf("n += 5 -> %d\n", n);
    n *= 2;  printf("n *= 2 -> %d\n", n);
    n >>= 1; printf("n >>= 1 -> %d\n", n);
    printf("bitcount(0xF0) = %d\n", bitcount(0xF0));
    printf("bitcount(255)  = %d\n", bitcount(255));
    return 0;
}
```

```output
n += 5 -> 15
n *= 2 -> 30
n >>= 1 -> 15
bitcount(0xF0) = 4
bitcount(255)  = 8
```

`x &= (x - 1)` is a beautiful piece of bit lore: subtracting 1 flips the lowest set bit to 0 and all bits below it to 1, so ANDing clears exactly that one bit. The loop runs once per set bit, making `bitcount` proportional to the number of 1s, not the word width. (Kernighan's algorithm — the same Kernighan as K&R.)

## Why compound assignment exists

Beyond brevity, `x op= y` evaluates the left-hand side **once**. That's not just tidier — it's *correct* when the left side has side effects or is expensive: `table[hash(key)] += 1` computes the slot a single time, whereas `table[hash(key)] = table[hash(key)] + 1` calls `hash` twice and may even index a different slot if `hash` isn't pure. The compiler also gets a cleaner picture for optimization. Treat `+=` and friends as the default; spell out `x = x + y` only when clarity demands it.

## Go deeper
- [Assignment operators (C)](https://en.cppreference.com/w/c/language/operator_assignment) — simple and compound forms
- [Expressions vs statements](https://en.wikipedia.org/wiki/Expression_(computer_science)) — why `a = b = c` works
- [Kernighan's bit-count](https://en.wikipedia.org/wiki/Hamming_weight) — counting set bits efficiently
- [lvalues and rvalues](https://en.cppreference.com/w/c/language/value_category) — what can appear on the left of `=`
