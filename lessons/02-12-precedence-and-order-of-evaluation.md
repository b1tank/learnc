---
id: 02-12-precedence-and-order-of-evaluation
chapter: 2
label: "2.12"
title: Precedence and Order of Evaluation
prev: 02-11-conditional-expressions
next: ex-2-1
status: done
---

Two different questions get mixed up here:

1. **Precedence** — how operators *bind* to their operands. `a + b * c` is `a + (b * c)` because `*` binds tighter than `+`.
2. **Order of evaluation** — the time order in which the operands are computed. Almost completely unspecified by C, with a few exceptions.

## The precedence table (highest to lowest)

| Level | Operators | Associativity |
|---|---|---|
| 1 | `()`  `[]`  `->`  `.` | left → right |
| 2 | unary `!`  `~`  `++`  `--`  `+`  `-`  `*`  `&`  `(type)`  `sizeof` | right → left |
| 3 | `*`  `/`  `%` | left → right |
| 4 | `+`  `-` | left → right |
| 5 | `<<`  `>>` | left → right |
| 6 | `<`  `<=`  `>`  `>=` | left → right |
| 7 | `==`  `!=` | left → right |
| 8 | `&` (bitwise) | left → right |
| 9 | `^` (bitwise XOR) | left → right |
| 10 | `\|` (bitwise OR) | left → right |
| 11 | `&&` | left → right |
| 12 | `\|\|` | left → right |
| 13 | `?:` | right → left |
| 14 | `=`  `+=`  `-=` … (all assignments) | right → left |
| 15 | `,` | left → right |

The full table from the standard has a few more rows; this covers everything you'll meet in K&R.

## Famous traps

1. **`*p++`** — `++` binds tighter than `*`, so this is `*(p++)`: dereference `p`, then increment the pointer. If you want "increment what `p` points to," write `(*p)++`.

2. **`a & MASK == b`** — `==` binds tighter than `&`. This parses as `a & (MASK == b)`, almost never what's intended. Write `(a & MASK) == b`.

3. **`a << b + c`** — `+` binds tighter than `<<`. This is `a << (b + c)`, not `(a << b) + c`. Almost certainly not what you wanted.

4. **Comparison chaining** — `1 < x < 10` is `(1 < x) < 10` → `(0 or 1) < 10` → always 1. You want `1 < x && x < 10`.

5. **Unary minus** binds tighter than binary: `-x * y` is `(-x) * y` (fine). But `-x % y` and other low-precedence rhs operators surprise some people. When in doubt, parenthesise.

```c:starter
#include <stdio.h>

int main(void) {
    int a = 2, b = 3, c = 4;

    printf("a + b * c       = %d  (expects 14)\n", a + b * c);
    printf("(a + b) * c     = %d  (expects 20)\n", (a + b) * c);
    printf("a << 1 + 1      = %d  (a << (1+1) = a*4 = 8)\n", a << 1 + 1);
    printf("(a << 1) + 1    = %d  (a*2 + 1 = 5)\n", (a << 1) + 1);

    /* short-circuit guarantee */
    int *p = NULL;
    if (p != NULL && *p > 0)
        printf("not reached\n");
    else
        printf("short-circuit saved a NULL deref\n");

    return 0;
}
```

```output
a + b * c       = 14  (expects 14)
(a + b) * c     = 20  (expects 20)
a << 1 + 1      = 8  (a << (1+1) = a*4 = 8)
(a << 1) + 1    = 5  (a*2 + 1 = 5)
short-circuit saved a NULL deref
```

## Order of evaluation

C does **not** specify the order in which function arguments are evaluated. `f(g(), h())` may call `g()` first or `h()` first — the compiler picks. The same applies to operands of binary operators (except `&&`, `||`, `?:`, and `,`, which are explicitly left-to-right with sequence points).

This means:

```c
printf("%d %d\n", n++, n);   /* UB — n read and modified */
arr[i] = i++;                /* UB — same reason */
```

are all undefined. **Each variable can be modified at most once between sequence points, and you can't read it again except to compute the modification.**

## Modern note

C11/C17 reformulated the old "sequence point" terminology as "sequenced before / sequenced after / indeterminately sequenced," but the practical rules are the same. Compile with `-Wsequence-point` to catch most cases; UB sanitiser catches the rest at runtime.

For the precedence table, the practical advice is shorter than the table itself: **when in doubt, add parentheses**. They cost nothing, and they make the code unambiguous to both compiler and reader.

## Try it

1. Print `1 << 2 + 3`. Predict the answer, then check. (Hint: it's `1 << 5 = 32`, not `4 + 3 = 7`.)
2. Write `flags & MASK == VAL` *without* parens. Compare to `(flags & MASK) == VAL`.
3. Write a small function that prints its argument and returns it. Use it twice in a `printf`: `printf("%d %d", trace(1), trace(2));`. The print order shows the evaluation order your compiler chose.

## Notes from the author

- Memorising the full precedence table is a fool's errand. Memorise: `*` and `/` beat `+` and `-`; comparisons beat `&&` which beats `||`; assignment is almost-last. Parenthesise everything else.
- The "argument-order is unspecified" thing is one of C's worst portability traps for new programmers. The same code may "work" on GCC for years, then break on a new compiler that picks the other order. Parenthesisation doesn't help here — the only fix is to compute side-effect arguments into temporaries first.
- For really tricky expressions (bit manipulation, pointer arithmetic), I generally write them with parens, then read the compiler-generated AST (via `clang -Xclang -ast-dump` or just `gdb`) to confirm. If you can't *easily* prove the meaning to yourself, your reviewers can't either.

🎉 **You've finished Chapter 2's section walkthroughs.** Up next: ten exercises that put types, operators, and conversions to work.

*Click **next →** to start the Chapter 2 exercises.*
