---
id: 02-11-conditional-expressions
chapter: 2
label: "2.11"
title: Conditional Expressions
prev: 02-10-assignment-operators-and-expressions
next: ex-2-10
status: done
---

The conditional (or *ternary*) operator `?:` is C's single three-operand operator. Read

```c
condition ? expr_if_true : expr_if_false
```

as: "if `condition` is non-zero, the result is `expr_if_true`, otherwise it's `expr_if_false`." Only one of the two branches is actually evaluated.

## When to reach for it

The classic case is **selecting between two values in an expression context**, where an `if`/`else` statement would force you to break the expression apart:

```c
int max  = (a > b) ? a : b;
int sign = (n > 0) ? 1 : (n < 0 ? -1 : 0);
printf("found %d item%s\n", n, n == 1 ? "" : "s");
```

```c:starter
#include <stdio.h>

int max(int a, int b) {
    return (a > b) ? a : b;
}

int main(void) {
    printf("max(3, 7)        = %d\n", max(3, 7));
    printf("sign of -5       = %d\n", (-5 > 0) ? 1 : (-5 < 0 ? -1 : 0));

    /* English-correct plural in one line */
    for (int n = 0; n <= 3; ++n)
        printf("%d item%s\n", n, n == 1 ? "" : "s");

    /* clamping */
    int x = 250;
    int clamped = x < 0 ? 0 : (x > 255 ? 255 : x);
    printf("clamp(250) = %d\n", clamped);

    return 0;
}
```

```output
max(3, 7)        = 7
sign of -5       = -1
0 items
1 item
2 items
3 items
clamp(250) = 250
```

## The result has a single type

Both branches must yield values that can be **converted to a common type**, and the result of the whole expression has that type. So:

```c
double d = (n > 0) ? n : 0.5;   /* n promoted to double */
```

is fine, but mixing `int` and `char *` is an error.

## Don't nest too deeply

`a > b ? a > c ? a : c : b > c ? b : c` is *technically* correct (it finds the maximum of three), but it reads like a puzzle. If you're nesting more than once or twice, switch to `if`/`else if`/`else` — readability wins.

## Precedence trap

`?:` has very low precedence — lower than assignment, even. So

```c
result = x > 0 ? x : 0 + offset;
```

parses as `result = (x > 0 ? x : (0 + offset))`. Add explicit parens if you mean otherwise.

## Modern note

`?:` is great for **value selection in initialisers** (where statements are not allowed):

```c
const int LIMIT = (sizeof(int) == 4) ? 1000000 : 100;
```

It's also handy in macros that need to be expressions: `#define ABS(x) ((x) < 0 ? -(x) : (x))`. (Beware double-evaluation of `x` — see chapter 4 on macros.)

For verbose multi-line conditionals or anything with side effects, just use `if`/`else`. The ternary is for *expressions*, not control flow.

## Try it

1. Replace `if (n < 0) n = -n; else n = n;` with a single `n = (n < 0) ? -n : n;`. (`abs` is in `<stdlib.h>` for the standard version.)
2. Print English-correct pluralisation: "1 cat", "2 cats", "0 cats". The trick is `n == 1 ? "" : "s"`.
3. Try the deeply nested max-of-three above. Replace it with an obvious cascade of `if`s. Note which version your future self prefers reading.

## Notes from the author

- The ternary is a tool, not a style. Use it for value selection, especially inside expressions where statements don't work (initialisers, function arguments, `return` lines). Don't use it as a clever substitute for `if`/`else` when the latter would be clearer.
- Always parenthesise the condition: `(a > b) ? a : b`, not `a > b ? a : b`. The version without parens still parses correctly because of precedence, but the parens save the reader a moment of mental parsing.
- For the `printf` plural trick: there are real i18n libraries (`gettext` with `ngettext`) that handle languages where the rules are more complex than English's one-or-many. For English-only debug output, the inline ternary is fine.

*Click **next →** to study operator precedence and order of evaluation.*
