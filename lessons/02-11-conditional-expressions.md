---
id: 02-11-conditional-expressions
chapter: 2
label: "2.11"
title: Conditional Expressions
prev: ex-2-9
next: ex-2-10
status: done
---

The ternary conditional operator `?:` is C's only three-operand operator and the one way to make a *choice inside an expression*. `cond ? a : b` evaluates `cond`; if true it yields `a`, otherwise `b` — and like `&&`/`||`, it evaluates only the branch it chooses. It compiles to the same conditional move or branch an `if/else` would, but because it's an expression it can sit anywhere a value is needed: inside a `printf` argument, an initializer, or a `return`.

## A value-producing if/else

```c:run the ternary operator
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 5; i++) {
        int even = (i % 2 == 0);
        printf("%d is %s\n", i, even ? "even" : "odd");   /* choose a string */
    }
    int a = 7, b = 12;
    int max = (a > b) ? a : b;     /* choose a value */
    printf("max = %d\n", max);
    return 0;
}
```

```output
1 is odd
2 is even
3 is odd
4 is even
5 is odd
max = 12
```

The win is avoiding a temporary and a four-line `if/else` just to pick between two values. `max = (a > b) ? a : b;` says exactly what it means in one line, and `printf("%d item%s\n", n, n == 1 ? "" : "s")` fixes plural grammar inline — a pattern impossible with statement-level `if`.

## Type, precedence, and restraint

The two arms are converted to a common type by the usual arithmetic conversions, so `x ? 1 : 2.0` has type `double` even when the `1` branch is taken. `?:` has very low precedence (just above assignment), so you'll often parenthesize the condition for readability and *must* parenthesize when nesting: `a ? b : c ? d : e` is legal (it groups right) but hard to read — reach for a `switch` or `if/else` chain once you have more than two outcomes. Used for a single binary choice, `?:` is clear; abused as a nested decision tree, it becomes write-only code.

## Go deeper
- [Conditional operator (C)](https://en.cppreference.com/w/c/language/operator_other#Conditional_operator) — semantics and result type
- [Operator precedence](https://en.cppreference.com/w/c/language/operator_precedence) — where `?:` sits
- [Conditional move](https://en.wikipedia.org/wiki/Conditional_move) — the branchless instruction it can compile to
