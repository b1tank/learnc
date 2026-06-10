---
id: 02-08-increment-and-decrement-operators
chapter: 2
label: "2.8"
title: Increment and Decrement Operators
prev: ex-2-3
next: ex-2-4
status: done
---

`++` and `--` add or subtract 1 in place. They come in two flavours that differ only in the **value the expression yields**, not in the side effect: `n++` (postfix) yields the *old* value then increments; `++n` (prefix) increments then yields the *new* value. Either way `n` ends up one larger. These exist because incrementing is so common that early machines had dedicated instructions for it (and C's heritage on the PDP‑11 made `++`/`--` map to auto-increment addressing modes).

## Old value vs new value

```c:run prefix versus postfix
#include <stdio.h>

int main(void) {
    int n = 5;
    printf("n=%d\n", n);
    printf("post n++ yields %d, then n=%d\n", n++, n);   /* yields 5, n becomes 6 */
    printf("pre  ++n yields %d, then n=%d\n", ++n, n);   /* n becomes 7, yields 7 */
    return 0;
}
```

```output
n=5
post n++ yields 5, then n=6
pre  ++n yields 7, then n=7
```

When the result value is ignored - a statement like `i++;` on its own line, or the third clause of a `for` loop - prefix and postfix are identical, and any decent compiler emits the same instruction. The distinction matters only when you *use* the value, as in `arr[i++] = x;` (store, then advance) versus `arr[++i] = x;` (advance, then store).

## The undefined-behavior trap

Because `++`/`--` have a side effect, using the same variable twice in one expression without a sequence point between is **undefined behavior**: `a[i] = i++;` or `n = n++ + 1;` may do anything, and different compilers genuinely differ. The rule of thumb: modify a variable at most once per expression, and don't also read it elsewhere in that expression for an unrelated purpose. The operators are a convenience, not a license to cram multiple mutations into one line.

## Go deeper
- [Increment/decrement operators (C)](https://en.cppreference.com/w/c/language/operator_incdec) - prefix/postfix semantics
- [Sequence points & UB](https://en.cppreference.com/w/c/language/eval_order) - why `i = i++` is undefined
- [PDP-11 auto-increment](https://en.wikipedia.org/wiki/PDP-11_architecture) - the hardware roots of `++`
