---
id: 04-functions-and-expressions
chapter: 2
label: "2.1"
title: Functions, expressions, and the increment operator
prev: 03-local-variable-lifetimes
next: 05-integer-types
status: draft
source:
  videoId: mw4gUqsGPZw
  url: https://www.youtube.com/watch?v=mw4gUqsGPZw
---

> **Source video.** [Impariamo il C — lezione 3](https://www.youtube.com/watch?v=mw4gUqsGPZw) by Salvatore Sanfilippo.

## TL;DR

A C function takes parameters and may return a value. `x = x + 1` is an **expression** (it produces a value); add a `;` and it becomes a **statement**. The shorthand `x++` does the same increment. Arguments are passed **by value** — the function works on a copy, so the caller's variable is unchanged unless the caller assigns the return value back.

## Walkthrough

### A function with a parameter `[08:07 → 09:30]`

Salvatore rewrites the earlier `inc` so it *takes* an `int` and *returns* an `int`:

```c
int inc(int x) {
    x = x + 1;
    return x;
}
```

Inside `inc`, `x` is a brand-new local variable seeded with the caller's value. Calling `inc(a)` does **not** modify `a` — it modifies the copy. The increment only "sticks" if the caller writes the result back: `a = inc(a)`.

### Expressions vs. statements `[00:00 → 02:02]`

`x + 1` on its own is an *expression*: a recipe that yields a value. The assignment `x = x + 1` is itself an expression (its value is the value stored), and the trailing `;` is what turns it into a *statement* — the unit the compiler executes in order. Don't confuse the assignment `=` with the equality test `==`; they are different operators.

### Pass-by-value, always `[10:53 → 11:34]`

C never silently passes a reference — not even for structs. If you need the callee to mutate the caller's data, you pass a pointer (covered in the next lesson). For now: a function changing its parameter changes only its own copy.

### `++` as shorthand `[23:16 → 23:52]`

`x++` and `++x` both mean "increment `x` by one." They differ only in the **value of the expression**: `x++` evaluates to the *old* value of `x`, while `++x` evaluates to the *new* one. The side effect on `x` is the same.

## Run it

```c:run inc with and without capturing the result
#include <stdio.h>

int inc(int x) {
    x = x + 1;
    return x;
}

int main(void) {
    int a = 10;
    inc(a);
    printf("after inc(a):     a = %d\n", a);
    a = inc(a);
    printf("after a = inc(a): a = %d\n", a);
    a = inc(a);
    printf("after a = inc(a): a = %d\n", a);
    return 0;
}
```

```output
after inc(a):     a = 10
after a = inc(a): a = 11
after a = inc(a): a = 12
```

The first call's return value is discarded — `a` keeps its 10. Only the assignments `a = inc(a)` change `a`.

### Prefix vs. postfix `++`

```c:run prefix vs postfix increment
#include <stdio.h>

int main(void) {
    int x = 5;
    int a = x++;   /* postfix: a gets the OLD x, then x becomes 6 */
    int y = 5;
    int b = ++y;   /* prefix:  y becomes 6, then b gets the NEW y */
    printf("postfix: a = %d, x = %d\n", a, x);
    printf("prefix:  b = %d, y = %d\n", b, y);
    return 0;
}
```

```output
postfix: a = 5, x = 6
prefix:  b = 6, y = 6
```

Both forms increment the variable; they differ only in what the surrounding expression sees.

## Under the hood (asm)

Strip the printing away and look at what `gcc -O2 -masm=intel` makes of bare `x++` vs `++x` vs `x++; ++x;`:

```asm
post:                          ; int post(int x) { return x++; }
        endbr64
        mov     eax, edi       ; return the OLD value of x
        ret                    ; (the increment is dead — never observed)
pre:                           ; int pre(int x) { return ++x; }
        endbr64
        lea     eax, [rdi+1]   ; return x + 1, in one instruction
        ret
both:                          ; { x++; ++x; return x; }
        endbr64
        lea     eax, [rdi+2]   ; two increments collapsed to x + 2
        ret
```

`lea` ("load effective address") is x86-64's swiss-army arithmetic instruction: it does an `add` without touching memory. At `-O2`, gcc proves the post-increment's side-effect is never observed and drops it; the asm for `post` is literally just a move. The whole "prefix vs postfix" hand-wringing disappears once the optimiser sees the value isn't used.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for register/calling-convention details.

## Try it

1. Drop the `return x;` from `inc` and change its return type to `void`. What does `a = inc(a)` now do? (Spoiler: it won't compile.)
2. Replace `x = x + 1;` inside `inc` with `x++;`. Same behaviour — confirm it.
3. Predict what `int n = 5; int m = n++ + ++n;` leaves in `m` and `n`. Then run it. (And note: combining multiple side effects on the same variable in one expression is *bad style* even when defined.)

## Cross-reference to K&R

This lesson lines up with [K&R § 1.8 — Arguments — Call by Value](../../kr/lessons/01-08-arguments-call-by-value.md); the `++` shorthand itself is covered in [K&R § 2.8 — Increment and Decrement Operators](../../kr/lessons/02-08-increment-and-decrement-operators.md).

## Go deeper

- cppreference — [Function declarations](https://en.cppreference.com/w/c/language/function_declaration) and [function call expressions](https://en.cppreference.com/w/c/language/operator_other#Function_call).
- cppreference — [Increment/decrement operators](https://en.cppreference.com/w/c/language/operator_incdec).
- cppreference — [Expressions vs. statements](https://en.cppreference.com/w/c/language/expressions).

*Click **next →** to dig into C's integer types.*
