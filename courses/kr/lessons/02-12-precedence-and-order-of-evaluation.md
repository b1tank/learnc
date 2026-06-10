---
id: 02-12-precedence-and-order-of-evaluation
chapter: 2
label: "2.12"
title: Precedence and Order of Evaluation
prev: ex-2-10
next: 03-01-statements-and-blocks
status: done
---

Two different questions hide behind "how is this expression evaluated?" **Precedence** and **associativity** decide how operators *group* into a parse tree - purely syntactic, fully defined. **Order of evaluation** decides *when* each operand is actually computed - and for most operators C leaves this **unspecified**, free for the compiler to reorder. Confusing the two produces bugs that pass every test on your machine and explode on someone else's compiler.

## Precedence builds the tree; mind the surprises

```c:run precedence pitfalls
#include <stdio.h>

int main(void) {
    int x = 4;
    /* & has LOWER precedence than == - a classic trap */
    printf("x & 1 == 0  parses as  x & (1==0) = %d\n", x & 1 == 0);
    printf("(x & 1) == 0  = %d  (what you meant)\n", (x & 1) == 0);
    /* * binds tighter than + */
    printf("2 + 3 * 4 = %d\n", 2 + 3 * 4);
    return 0;
}
```

```output
x & 1 == 0  parses as  x & (1==0) = 0
(x & 1) == 0  = 1  (what you meant)
2 + 3 * 4 = 14
```

The bitwise operators (`&`, `|`, `^`) having *lower* precedence than the comparison operators is a historical wart from before `&&`/`||` existed. The fix is permanent: **parenthesize bitwise expressions** whenever they meet `==`/`<`/etc. Don't try to memorize all ~15 precedence levels; learn the few traps (`&` vs `==`, `*p++`, `a ? b : c = d`) and parenthesize when unsure.

## Order of evaluation is *unspecified* - don't depend on it

Precedence does **not** dictate evaluation order. In `f() + g()`, C does not promise `f` runs before `g`. So an expression that reads and writes the same object, or calls two functions with side effects whose order matters, is unsafe:

```c
printf("%d %d\n", next_id(), next_id());   /* which call runs first? UNSPECIFIED */
n = i++ + i;                               /* UNDEFINED behavior, not just unspecified */
```

The first may print `1 2` on gcc and `2 1` on clang. The second is outright undefined - modifying `i` and reading it elsewhere with no sequence point between. The rule: **don't let one object be modified twice, or modified and read, within a single expression**, and don't rely on left-to-right call order. Sequence points (`,` operator, `&&`, `||`, `?:`, and the end of a full expression) are the only places ordering is guaranteed.

## Go deeper
- [Operator precedence (C)](https://en.cppreference.com/w/c/language/operator_precedence) - the full table, for reference not memorization
- [Order of evaluation](https://en.cppreference.com/w/c/language/eval_order) - sequence points and what's guaranteed
- [Sequence point](https://en.wikipedia.org/wiki/Sequence_point) - the formal notion behind the rules
- [Unspecified vs undefined behavior](https://en.wikipedia.org/wiki/Undefined_behavior) - why the distinction matters
