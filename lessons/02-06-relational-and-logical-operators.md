---
id: 02-06-relational-and-logical-operators
chapter: 2
label: "2.6"
title: Relational and Logical Operators
prev: 02-05-arithmetic-operators
next: ex-2-2
status: done
---

C has no boolean type in its original form — truth is just an integer. A relational operator (`<`, `>`, `<=`, `>=`, `==`, `!=`) produces `1` for true and `0` for false. The logical operators `&&` (and), `||` (or), `!` (not) combine these, and they have a superpower the bitwise operators lack: **short-circuit evaluation**. The right operand is evaluated only if the result isn't already determined.

## Short-circuiting is control flow in disguise

`A && B` stops at `A` if `A` is false; `A || B` stops at `A` if `A` is true. The compiler emits a conditional branch — the right side may never run. The `spy()` function below prints only when it's actually evaluated, exposing the skip:

```c:run short-circuit evaluation
#include <stdio.h>

int spy(int v, const char *tag) { printf("  evaluated %s\n", tag); return v; }

int main(void) {
    printf("&& short-circuits when left is false:\n");
    if (spy(0, "left") && spy(1, "right"))
        ;
    printf("|| short-circuits when left is true:\n");
    if (spy(1, "left") || spy(1, "right"))
        ;
    printf("a relational result is just 0 or 1: (3 > 2) = %d\n", 3 > 2);
    return 0;
}
```

```output
&& short-circuits when left is false:
  evaluated left
|| short-circuits when left is true:
  evaluated left
a relational result is just 0 or 1: (3 > 2) = 1
```

This is why `if (p != NULL && p->value > 0)` is safe: the `p->value` dereference never runs when `p` is null. Reordering those two tests would crash. Short-circuiting isn't an optimization — it's a guarantee you can build correctness on.

## `=` vs `==`, and "truthiness"

Any nonzero value is "true" in a condition, not just `1`. So `if (x)` means "if x is nonzero." This makes the classic typo `if (x = 0)` especially nasty: it *assigns* 0 to `x` and then tests that 0 — always false, no error. Compilers warn about it (`-Wparentheses`); some programmers write `if (0 == x)` so a typo'd `=` becomes a compile error. Since C99, `<stdbool.h>` provides `bool`, `true`, `false` as a readable veneer, but underneath it's still integers.

## Go deeper
- [Logical operators (C)](https://en.cppreference.com/w/c/language/operator_logical) — `&&`, `||`, `!` and short-circuit rules
- [Comparison operators (C)](https://en.cppreference.com/w/c/language/operator_comparison) — the relational set
- [Short-circuit evaluation](https://en.wikipedia.org/wiki/Short-circuit_evaluation) — the broader concept
- [`<stdbool.h>`](https://en.cppreference.com/w/c/types/boolean) — the modern boolean veneer
