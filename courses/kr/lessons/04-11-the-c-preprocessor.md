---
id: 04-11-the-c-preprocessor
chapter: 4
label: "4.11"
title: The C Preprocessor
prev: ex-4-13
next: ex-4-14
status: done
---

Before the compiler ever sees your code, a separate pass called the **preprocessor** runs over it doing pure text substitution. It handles every line beginning with `#`: `#include` pastes in a file, `#define` creates macros, and `#if`/`#ifdef` conditionally keep or delete chunks of source. The preprocessor knows nothing about C's grammar, types, or scope - it just manipulates tokens, then hands the expanded text to the actual compiler. You can see its output with `gcc -E`. Understanding it explains where headers come from, how constants and macros work, and why some bugs are so baffling.

## Object-like and function-like macros

```c:run constants and macros expand before compiling
#include <stdio.h>

#define PI 3.14159                       /* object-like: a named constant */
#define SQUARE(x) ((x) * (x))            /* function-like: takes arguments */
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int main(void) {
    double area = PI * SQUARE(2);        /* -> 3.14159 * ((2)*(2)) */
    printf("area = %.2f\n", area);
    printf("max(3,9) = %d\n", MAX(3, 9));
    printf("SQUARE(1+1) = %d\n", SQUARE(1 + 1));   /* -> ((1+1)*(1+1)) = 4 */
    return 0;
}
```

```output
area = 12.57
max(3,9) = 9
SQUARE(1+1) = 4
```

A macro is a *find-and-replace* rule applied to the source text. `SQUARE(2)` literally becomes `((2) * (2))` before compilation - there's no function call, no stack frame. Notice the **parentheses everywhere**: without the inner ones, `SQUARE(1 + 1)` would expand to `1 + 1 * 1 + 1 = 3` instead of 4, because the macro doesn't understand precedence - it just substitutes text. This is the cardinal rule of function-like macros: wrap every parameter *and* the whole body in parentheses.

## Power and its sharp edges

Macros expand textually, which makes them powerful but treacherous. Because there's no type checking and no scope, a macro can do things a function can't - but also breaks in ways a function never would. The classic trap is **double evaluation**: `MAX(i++, j)` expands to `((i++) > (j) ? (i++) : (j))`, incrementing `i` *twice*. For named constants, prefer `const int` or `enum` in modern C - they're typed and visible to the debugger, unlike a `#define` that has vanished by compile time. Reserve macros for what they're genuinely good at: conditional compilation (`#ifdef DEBUG`), include guards, platform shims, and `assert`-style tricks using `#` (stringize) and `##` (token paste). When you suspect a macro is misbehaving, run `gcc -E file.c` and read the expanded source - the preprocessor's output is the ground truth the compiler actually sees.

## Go deeper
- [The C preprocessor](https://en.cppreference.com/w/c/preprocessor) - directives reference
- [`#define` and macros](https://en.cppreference.com/w/c/preprocessor/replace) - object- and function-like, `#` and `##`
- [Conditional inclusion](https://en.cppreference.com/w/c/preprocessor/conditional) - `#if`, `#ifdef`, `#endif`
- [GCC `-E` and `-dM`](https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html) - inspect what the preprocessor produces
