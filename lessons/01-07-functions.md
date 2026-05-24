---
id: 01-07-functions
chapter: 1
label: "1.7"
title: Functions
prev: 01-06-arrays
next: 01-08-arguments-call-by-value
status: done
---

Until now every program has been one big `main`. That works for twenty lines and falls apart at two hundred. A **function** is a named block of code that takes inputs, does work, and returns an output — a black box whose contract is "give me arguments of these types, get back a value of this type, don't worry about the inside." Functions are how you turn a script into a vocabulary.

The classic first function is integer power: raise `base` to the `exponent`. Below, `power(base, n)` is a function `main` calls twice — once per row of a small table.

```c:starter
#include <stdio.h>

int power(int base, int n);   /* prototype: tell the compiler the shape */

int main(void) {
    for (int i = 0; i < 10; ++i)
        printf("%d %6d %6d\n", i, power(2, i), power(-3, i));
    return 0;
}

/* power: raise base to the n-th power; n >= 0 */
int power(int base, int n) {
    int result = 1;
    for (int i = 0; i < n; ++i)
        result = result * base;
    return result;
}
```

```output
0      1      1
1      2     -3
2      4      9
3      8    -27
4     16     81
5     32   -243
6     64    729
7    128  -2187
8    256   6561
9    512 -19683
```

## What's going on

- **A function definition has four parts.** `int power(int base, int n) { … }` reads "function named `power` returning `int`, taking an `int` called `base` and an `int` called `n`, body in braces." The names `base` and `n` are *local* to the function — they are fresh variables the caller's arguments are copied into.
- **The return statement.** `return result;` ends the function and hands `result` back to whoever called it. The expression you return must match (or be convertible to) the declared return type. A function declared `int` that falls off the end without `return` invokes undefined behaviour.
- **The prototype above `main`.** `int power(int base, int n);` (note the semicolon, no body) tells the compiler the function's shape so calls to `power` inside `main` can be checked against it. Prototypes give you type safety across the boundary — call `power("hi", 3.5)` and the compiler refuses. Without a prototype, K&R's pre-ANSI dialect would let almost anything through and silently produce garbage.
- **Order doesn't matter when prototypes exist.** With the prototype, `power` can be defined *after* `main`. Without it, `power` would have to come before `main` — or the compiler would invent an implicit `int power()` declaration and shrug at the argument types.
- **Calls produce values, like any expression.** `power(2, i)` evaluates to the int result. You can use it as a `printf` argument, assign it to a variable, pass it to another function — anywhere an `int` is expected. This is what makes functions composable.
- **Two `for` loops, two `i`s.** The `i` inside `power` is a different variable from the `i` inside `main`. Each lives in its own *stack frame*; when `power` returns, its frame is discarded. Scope, lifetime, and storage are the next several lessons; here, the takeaway is: locals don't leak.

## Modern note

K&R-style declarations look like `int power(base, n) int base, n;` (parameter types *between* the header and the body). ANSI C, C99, and onward use the prototype form shown above: types live with the names inside the parens. The old form still compiles in many toolchains for backwards compatibility, but C23 finally removes it. Use prototype form.

Two more habits modern C codebases adopt:

- **`static` for file-local helpers.** If `power` is only used inside this `.c` file, declare it `static int power(...)`. The function becomes invisible to the linker, which lets you reuse short names across files without collisions and gives the optimiser more freedom.
- **`const` for parameters you won't modify.** `int power(const int base, const int n)` is legal — it says "I promise not to reassign these inside the body." Common on pointer parameters (`const char *s` = "I'll read this string, not change it"); less useful on scalars, since copies of scalars can't be observed by anyone else anyway.

The void-vs-empty-parameters footnote from §1.1 applies here too: `int power(void)` means "no parameters"; `int power()` historically meant "unknown — figure it out." Always write `void` when you mean it.

## Try it

1. Replace the prototype with no prototype at all and move `power` below `main`. What warning or error does the compiler give? (Modern compilers usually escalate this to an error under `-Werror=implicit-function-declaration`.)
2. Make `power` `static`. Recompile — does anything change? (It shouldn't, in a single-file program.)
3. Add a third argument, `int mod`, and return `(base^n) mod m`. This is the building block of RSA encryption. Watch out for integer overflow on large exponents.
4. Write a separate `int square(int x)` function and rewrite the inner loop body as `result = result * base;` ↦ `result = result * base;` — no change required. Now write `int square(int x) { return x * x; }` and use it: rewrite `power(2, n)` calls to use `square` where possible. Where can you *not* use it? Why?
5. Negative exponents: what happens if you call `power(2, -1)`? Modify the function to handle `n < 0` (return `0`, since integer division would give zero anyway, and a real fix requires floats).
6. Tail recursion: rewrite `power` recursively — `power(b, 0) = 1; power(b, n) = b * power(b, n-1);`. Run it. The two versions should agree for all reasonable inputs.

## Notes from the author

- The function example here is `power` because that's K&R's choice and it's a clean illustration. If you want to push the modern angle harder when you revise, swap it for a function that does string manipulation (`strlen` reimplemented) or hashing — both feel more like real code and segue better into pointers in chapter 5.
- I deliberately gave the prototype its own bullet rather than burying it in the explanation. Pre-ANSI vs ANSI prototypes are the *first* place K&R-the-book diverges most sharply from K&R-the-language-as-used-today, and most modern bugs (implicit `int`, no argument checking) are downstream of getting this wrong.
- The recursion experiment at the end is a teaser for §4.10. If you want to introduce recursion gently here, expand it; otherwise leave the bait.
- Worth a future callout: function pointers exist (`int (*fp)(int, int)`), and the syntax is famously gnarly. K&R covers them in §5.11. A one-liner here — "every function has an address, you can take it" — would help motivate that later.

*Click **next →** to learn what C does and does not do with the arguments you pass.*
