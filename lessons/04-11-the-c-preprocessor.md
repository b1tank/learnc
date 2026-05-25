---
id: 04-11-the-c-preprocessor
chapter: 4
label: "4.11"
title: The C Preprocessor
prev: ex-4-13
next: ex-4-14
status: done
---

Before the compiler proper sees your code, the **preprocessor** runs a textual pass that handles `#include`, `#define`, `#if`, and friends. Its job is pure text substitution — it doesn't understand C's grammar, it just rewrites the source.

## File inclusion: `#include`

```c
#include <stdio.h>     /* system header (angle brackets) */
#include "myheader.h"  /* project header (double quotes) */
```

The preprocessor literally pastes the contents of the named file at this line. Headers themselves can `#include` other headers; the chain expands fully before the compiler sees anything.

## Macro substitution: `#define`

### Object-like macros

```c
#define MAXVAL  100
#define PI      3.14159265358979323846
#define COLOR   "blue"

int v[MAXVAL];     /* becomes: int v[100]; */
double r = 2 * PI; /* becomes: double r = 2 * 3.14159...; */
```

`MAXVAL`, `PI`, `COLOR` become the replacement text everywhere they appear (outside string literals). The replacement is *textual* — the preprocessor doesn't know `100` is an integer; it just substitutes.

### Function-like macros

```c:starter
#include <stdio.h>

#define max(a, b)  ((a) > (b) ? (a) : (b))
#define square(x)  ((x) * (x))

int main(void) {
    printf("max(3, 7)        = %d\n", max(3, 7));
    printf("max(2+5, 4)      = %d\n", max(2+5, 4));
    printf("square(3)        = %d\n", square(3));
    printf("square(2+1)      = %d\n", square(2+1));
    return 0;
}
```

```output
max(3, 7)        = 7
max(2+5, 4)      = 7
square(3)        = 9
square(2+1)      = 9
```

## The macro trap: parenthesise everything

Without the parentheses, `square(2+1)` expands to `2+1 * 2+1` = `5` (because of operator precedence), not `9`. The textual-substitution model bites:

```c
#define square(x)  x * x          /* BROKEN */

square(2+1)  /* expands to: 2+1*2+1, which is 5 */
```

Both `x` and the whole expression must be wrapped:

```c
#define square(x)  ((x) * (x))    /* SAFE */
```

A second classic gotcha: side effects evaluated twice:

```c
#define max(a, b)  ((a) > (b) ? (a) : (b))

int i = 5;
int m = max(++i, 7);    /* expands to: ((++i) > (7) ? (++i) : (7)) */
                        /* i ends up incremented twice! */
```

For this reason, **modern C prefers `static inline` functions over function-like macros**. They give you the same zero-cost behaviour without the double-evaluation pitfall:

```c
static inline int max_i(int a, int b) {
    return a > b ? a : b;
}
```

Use macros only when you genuinely need type-generic behaviour (a macro `max` works for `int`, `double`, `float`, ...; a function works for one type at a time).

## Conditional compilation

```c
#if defined(__APPLE__) || defined(__linux__)
    /* POSIX-ish code */
#elif defined(_WIN32)
    /* Windows-specific code */
#else
    #error "unsupported platform"
#endif
```

`#if`, `#ifdef`, `#ifndef`, `#elif`, `#else`, `#endif` — gate code on compile-time conditions. Used heavily for:

- Platform-specific code paths
- Debug vs release builds (`#ifdef DEBUG`)
- Feature flags
- Include guards (we saw this in §4.5)

## The stringify and token-paste operators

Inside a function-like macro:

- `#x` turns the macro argument `x` into a string literal: `#define STR(x) #x` makes `STR(hello)` expand to `"hello"`.
- `a##b` glues two tokens together: `#define CAT(a,b) a##b` makes `CAT(foo, _bar)` expand to `foo_bar`.

These power some elegant C idioms (and some indecipherable ones — looking at you, X-macros).

## Modern note

- C99/C11 added `inline` and `static inline`; for most macro uses, inline functions are safer.
- C11 also added `_Generic` for type-generic *expressions* — closer to "real" generic functions than macros.
- **Avoid clever macros.** If a macro is doing more than a one-line substitution, you're paying in debuggability (the debugger sees the post-expansion text, not your nice macro) for negligible gain.

## Try it

1. Write a `MAX_OF_3(a, b, c)` macro by combining two `MAX(a, b)` invocations. Parenthesise carefully — every argument, every reference. Test with various subexpressions.
2. Convert your `MAX` macro to a `static inline int max_i(int, int)` function. Compare the generated assembly with `-O2` — the function inlines to the same instructions as the macro, with no double-evaluation risk.
3. Build a quick `#ifdef DEBUG` toggle: `#define LOG(msg) ((void)0)` by default, but if `DEBUG` is defined, `#define LOG(msg) fprintf(stderr, "[debug] %s\n", msg)`. Now `LOG("hi")` costs nothing in release builds.

## Notes from the author

- The preprocessor is C's most powerful and most dangerous feature. It runs *before* type checking, so all the safety nets are off. Use it sparingly.
- Function-like macros were how C did generic programming for decades. Modern code uses `static inline` functions or, for true type-genericity, `_Generic`. The macro form survives mostly for performance-critical headers (the standard library's `<ctype.h>` is largely macros).
- Conditional compilation gets messy fast. If a file has more than ~5 `#ifdef`s, consider splitting platform-specific code into separate `.c` files and choosing which to build via your build system. CMake, Make, and friends all support this cleanly.

🎉 **You've finished Chapter 4's section walkthroughs.** Next: 14 exercises that build out the calculator, a `wordlength` filter, recursive print-routines, and macro experiments.

*Click **next →** to start the Chapter 4 exercises.*
