---
id: 01-03-the-for-statement
chapter: 1
label: "1.3"
title: The for Statement
prev: ex-1-4
next: ex-1-5
status: done
---

The `while` loop you just met takes four lines to express a counted iteration: declare a counter, initialise it before the loop, test it in the header, update it inside the body. Three of those four lines exist purely to manage the counter — none of them are the "real work." The `for` statement is C's way of folding all three counter-management lines into a single header so the body of the loop can be just the work you actually care about.

```c:starter
#include <stdio.h>

int main(void) {
    int fahr;

    printf("Fahr  Celsius\n");
    for (fahr = 0; fahr <= 300; fahr = fahr + 20)
        printf("%4d  %6.1f\n", fahr, (5.0/9.0) * (fahr - 32));

    return 0;
}
```

```output
Fahr  Celsius
   0   -17.8
  20    -6.7
  40     4.4
  60    15.6
  80    26.7
 100    37.8
 120    48.9
 140    60.0
 160    71.1
 180    82.2
 200    93.3
 220   104.4
 240   115.6
 260   126.7
 280   137.8
 300   148.9
```

## What's going on

- **The three slots.** `for (init; test; update)` runs `init` once, evaluates `test`, runs the body if `test` is true, runs `update`, then loops back to `test`. Each slot is a full expression, separated by semicolons (note: semicolons inside the parentheses, no trailing one outside).
- **Mechanically equivalent to `while`.** Anything `for (a; b; c) body` does, `a; while (b) { body; c; }` does too. Pick `for` when the three pieces are short and related; pick `while` when initialisation lives far above the loop or the update is conditional inside the body.
- **The body can be a single statement or a brace-enclosed block.** Above, the body is one `printf` so the braces are gone. The moment you need two statements in the body, the braces come back. Many style guides — and most modern compilers under `-Wall` — recommend always using braces to prevent the [Apple goto fail](https://en.wikipedia.org/wiki/Goto_Fail) class of bug.
- **The slots can be any expression, not just counter math.** `init` can be `i = 0, j = 10` (comma operator). `test` can be `getchar() != EOF`. `update` can be `p = p->next` walking a linked list. The `for` is general-purpose; the counter pattern is just its most common use.
- **Floating-point arithmetic this time.** `(5.0/9.0) * (fahr - 32)` — the `.0` suffix on at least one operand promotes the whole expression to `double`. Compare with §1.2 where `5/9` was integer division and produced zero. `5.0/9.0` is a `double` constant the compiler folds at compile time, so there's no runtime division cost.
- **`%6.1f` format.** The `6` is field width (minimum characters), the `.1` is precision (digits after the decimal point), the `f` says "fixed-point floating value." `%-6.1f` would left-justify instead of right-justify. The companion specifiers you'll see soon: `%e` (scientific), `%g` (whichever of `e`/`f` is shorter), `%lf` for `double` in `scanf` (but not `printf` in C99+).

## Modern note

K&R's `for` example drops the table heading. I added it because in a real terminal you read code top-down and a header makes the table self-documenting — that's the kind of polish a working programmer adds without thinking.

C99 lets you declare the loop variable in the `init` slot: `for (int fahr = 0; fahr <= 300; fahr += 20)`. The variable's scope is the `for` statement only, which is exactly what you want — it can't leak into surrounding code and accidentally shadow something. K&R's pre-ANSI dialect didn't allow this; modern C does and you should prefer it. The wasm compiler here accepts both forms.

Also note `fahr = fahr + 20` and `fahr += 20` compile to the same machine code. K&R uses the long form in early chapters to keep things explicit; in real code people write `+=`.

## Try it

1. Rewrite the loop using `for (int fahr = 0; fahr <= 300; fahr += 20)`. Confirm the output is identical. Then try to use `fahr` after the loop — what error does the compiler give you?
2. Print the table in reverse: 300 down to 0 in steps of 20. You need to change three things in the `for` header. Which three?
3. Comma operator: declare a second variable `int row` in the `for` header and have it count from 1 upward at the same time `fahr` counts up. Print `row` as the first column. Hint: `for (fahr = 0, row = 1; fahr <= 300; fahr += 20, row++)`.
4. Empty slots. Remove the `init`, the `test`, or the `update` — what does the compiler do? (`for (;;)` is a perfectly legal infinite loop.)
5. Take out the second `(5.0/9.0)` and write `(5/9) * (fahr - 32)` instead. Every Celsius value should now be zero. Explain why, *without* running the code, before you confirm.

## Notes from the author

- The headline idea — "`for` and `while` are equivalent; the choice is stylistic" — is the *only* thing you'll come back for. The rest is muscle memory. When you revise, consider trimming the bullet list down to that one sentence plus the syntax diagram.
- I deliberately repeated the temperature table here instead of inventing a new example, because §1.3 in the book is explicitly "the same program, different shape." If you'd rather break the pattern and use, say, "print powers of two until they overflow `int`," it'd give a stronger pull into §1.4 (symbolic constants for `INT_MAX`).
- The `for (;;)` infinite-loop trick in experiment #4 is one of the most idiomatic patterns in real C (think event loops, daemon main functions). Worth a callout box if you expand this lesson.
- I picked `%6.1f` to match what K&R uses in the book — but feel free to switch to `%8.2f` if you want to show what the precision/width fields actually do.

*Click **next →** to learn how `#define` makes the magic numbers in this loop self-documenting.*
