---
id: 04-02-functions-returning-non-integers
chapter: 4
label: "4.2"
title: Functions Returning Non-integers
prev: 04-01-basics-of-functions
next: 04-03-external-variables
status: done
---

By default — in pre-ANSI C — a function whose return type isn't declared was assumed to return `int`. That defaulting was a bug magnet: declare a function returning `double` without a prototype and the caller would interpret the bits as an `int`, producing garbage.

ANSI C, C99, and modern toolchains require an explicit return type. So **always declare it**, especially for non-int returns.

## Example: a tiny atof

`atof` converts a string like `"3.14"` or `"-42.5e3"` to a `double`.

```c:starter
#include <stdio.h>
#include <ctype.h>

double my_atof(const char s[]);

int main(void) {
    printf("'3.14'      -> %g\n", my_atof("3.14"));
    printf("'-42.5'     -> %g\n", my_atof("-42.5"));
    printf("'  +0.001'  -> %g\n", my_atof("  +0.001"));
    printf("'invalid'   -> %g\n", my_atof("invalid"));
    return 0;
}

double my_atof(const char s[]) {
    double val = 0.0;
    double power = 1.0;
    int i = 0, sign = 1;

    while (isspace((unsigned char)s[i]))   /* skip leading whitespace */
        ++i;

    if (s[i] == '+' || s[i] == '-')
        sign = (s[i++] == '+') ? 1 : -1;

    for (; isdigit((unsigned char)s[i]); ++i)
        val = 10.0 * val + (s[i] - '0');

    if (s[i] == '.')
        ++i;

    for (; isdigit((unsigned char)s[i]); ++i) {
        val = 10.0 * val + (s[i] - '0');
        power *= 10.0;
    }

    return sign * val / power;
}
```

```output
'3.14'      -> 3.14
'-42.5'     -> -42.5
'  +0.001'  -> 0.001
'invalid'   -> 0
```

## What's different from int-returning functions

Mechanically nothing — the compiler emits different return-register conventions for `double` vs `int`, but the source-level rules are identical. What matters is **that the prototype is in scope at every call site**.

Without the prototype, the call `my_atof(s)` would assume `int` return, read the bits in a way that doesn't match the `double` ABI, and produce nonsense. With the prototype, the compiler generates the right load.

## Why `isspace((unsigned char)s[i])`?

`isspace` and friends (in `<ctype.h>`) take an `int` argument that's either `EOF` or a value representable as `unsigned char`. Passing a plain `char` directly — which may be signed on some platforms — produces undefined behaviour for negative values (any character ≥ 128 on signed-char systems).

The cast `(unsigned char)` reinterprets the byte's bits as a small positive number, which is the legal input form. This applies to all `<ctype.h>` functions and to `tolower`/`toupper`. Common and important fix.

## Modern note

- The standard library's `atof` and `strtod` are locale-aware. `strtod` is the recommended one because it tells you where parsing stopped (via an out-pointer).
- For robust parsing, `errno` is set by `strtod` on overflow/underflow; `atof` cannot signal errors. Production code uses `strtod`.

## Try it

1. Add exponent support: parse `1e3` or `2.5e-4`. After the fraction-digit loop, look for `e`/`E`, parse a signed integer, multiply or divide `val` by `10^exp` (use a loop, not `pow`, to keep this exercise standard-library-free).
2. Return a separate success flag: change the signature to `int my_atof(const char *s, double *out)`. Return 0 on success, -1 on garbage. This is the modern style.
3. Compile with the prototype commented out. What warning does `-Wall` emit?

## Notes from the author

- The `(unsigned char)` cast for `<ctype.h>` calls is a real-world C bug that bites every team. CERT-C calls it out as MSC10. Learn it once; use it forever.
- `double` is the right pick for numeric work unless you have a specific reason to use `float` (memory pressure, GPU). The extra precision is essentially free on modern CPUs.
- `my_atof` here doesn't handle hex floats (`0x1.8p4`), infinity, or NaN — `strtod` does. The point of writing your own is to understand the layered structure: sign, integer part, fraction, exponent. Real parsers are just this with edge cases.

*Click **next →** for external variables and multi-file programs.*
