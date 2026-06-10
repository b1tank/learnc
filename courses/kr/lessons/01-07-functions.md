---
id: 01-07-functions
chapter: 1
label: "1.7"
title: Functions
prev: ex-1-14
next: ex-1-15
status: done
---

You already know what a function is. In C only a few things differ from the high-level languages you came from, and each one bites if you ignore it:

- **Declaration vs definition.** A *prototype* declares the signature; the *definition* supplies the body. Calls are checked against whatever declaration is in scope - and if there is none, older C silently invents one.
- **Pass by value, always.** Every argument is *copied*. The only way a function changes the caller's data is through a pointer (next lesson).
- **One return value, by value.** No tuples, no multiple returns. A non-`void` function that falls off the end without returning is undefined behaviour.

The canonical first function is integer power. `power(base, n)` is called twice per row to build a small table.

```c:run power.c
#include <stdio.h>

int power(int base, int n);   /* prototype: declare the shape up front */

int main(void) {
    for (int i = 0; i < 10; ++i)
        printf("%d %6d %6d\n", i, power(2, i), power(-3, i));
    return 0;
}

/* power: raise base to the n-th power, n >= 0 */
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

## Declaration vs definition

The signature can appear twice: once as a *prototype* (no body, ends in `;`), once as the *definition* (with body). The prototype is what lets `main` call `power` before `power` is defined, and it is what makes the call type-checked.

```c
int power(int base, int n);          /* declaration - a promise */
int power(int base, int n) { ... }   /* definition - the body   */
```

Delete the prototype, call a function before it is defined, and pre-ANSI C would assume it returns `int` and accept any arguments. Modern compilers reject this (`-Werror=implicit-function-declaration`) - run it and read the diagnostic:

```c:run missing prototype → error
#include <stdio.h>

int main(void) {
    printf("%d\n", cube(3));   /* no declaration of cube in scope */
    return 0;
}

int cube(int x) { return x * x * x; }
```

## Pass by value

A function receives *copies* of its arguments. Assigning to a parameter changes only the local copy; the caller never sees it. This is the single most important thing to internalise before pointers.

```c:run pass-by-value
#include <stdio.h>

void try_reset(int x) { x = 0; }   /* x is a private copy */

int main(void) {
    int a = 5;
    try_reset(a);
    printf("%d\n", a);   /* still 5 - the copy was thrown away */
    return 0;
}
```

```output
5
```

## Return type and `void`

`return expr;` ends the function and hands `expr` back; its type must match (or convert to) the declared return type. Two rules with sharp edges:

- A non-`void` function that runs off the end and whose result is then used is undefined behaviour. Turn on `-Wreturn-type`.
- `int f(void)` means *no parameters*. `int f()` means *unspecified parameters* (a pre-ANSI relic), not "no parameters". Always write `void` when you mean none - calling `answer(1)` below is a compile error precisely because of the `void`.

```c:run void means no args
#include <stdio.h>

int answer(void) { return 42; }   /* (void): takes nothing */

int main(void) {
    printf("%d\n", answer(1));     /* error: too many arguments */
    return 0;
}
```

## `static`: internal linkage

By default a top-level function has *external* linkage - its name is visible to the linker and to every other `.c` file. Mark it `static` to give it *internal* linkage: private to this translation unit. That lets short helper names live in many files without colliding, and gives the optimiser a closed world to inline into.

```c:run static helper
#include <stdio.h>

static int twice(int x) { return 2 * x; }   /* invisible to the linker */

int main(void) {
    printf("%d\n", twice(21));
    return 0;
}
```

```output
42
```

## `const` parameters

`const` on a parameter is a promise not to reassign it inside the body. On a scalar it is only documentation - the copy is yours to mutate harmlessly - but on a *pointer* it is load-bearing: `const char *s` means "I read this string, I do not write it", and the compiler enforces it.

```c:run const parameter
#include <stdio.h>
#include <stddef.h>

size_t my_strlen(const char *s) {   /* won't modify the caller's bytes */
    size_t n = 0;
    while (*s++) ++n;
    return n;
}

int main(void) {
    printf("%zu\n", my_strlen("hello, world"));
    return 0;
}
```

```output
12
```

## Old-style declarations (don't write these)

K&R's original syntax put parameter types *between* the header and the body:

```c
int power(base, n)
int base, n;
{ ... }
```

It still compiles in many toolchains for backward compatibility, but it does no argument checking and C23 finally removes it. Always use prototype form.

## Variations

Each block below is a complete, runnable program - edit and re-run any of them.

Modular exponentiation, `(base^n) mod m` - the kernel of RSA. Reducing every step keeps the intermediate product small:

```c:run modular exponentiation
#include <stdio.h>

long powmod(long base, int n, long m) {
    long r = 1 % m;
    base %= m;
    for (int i = 0; i < n; ++i)
        r = (r * base) % m;
    return r;
}

int main(void) {
    printf("%ld\n", powmod(2, 10, 1000));   /* 1024 mod 1000 */
    printf("%ld\n", powmod(7, 128, 13));
    return 0;
}
```

```output
24
3
```

Negative exponents can't be represented as an `int`, so clamp instead of returning garbage:

```c:run negative exponent
#include <stdio.h>

int power(int base, int n) {
    if (n < 0) return 0;          /* base^-n is a fraction, not an int */
    int r = 1;
    while (n-- > 0) r *= base;
    return r;
}

int main(void) {
    printf("%d %d %d\n", power(2, 3), power(2, 0), power(2, -1));
    return 0;
}
```

```output
8 1 0
```

The recursive definition - `power(b, 0) = 1`, `power(b, n) = b * power(b, n-1)` - is a one-liner and a teaser for §4.10:

```c:run recursive power
#include <stdio.h>

int power(int base, int n) {
    return n == 0 ? 1 : base * power(base, n - 1);
}

int main(void) {
    for (int i = 0; i < 6; ++i)
        printf("2^%d = %d\n", i, power(2, i));
    return 0;
}
```

```output
2^0 = 1
2^1 = 2
2^2 = 4
2^3 = 8
2^4 = 16
2^5 = 32
```

Functions compose like any expression - the result of one is an argument to the next:

```c:run compose with square
#include <stdio.h>

int square(int x) { return x * x; }

int main(void) {
    printf("%d\n", square(square(2)));   /* (2^2)^2 = 16 */
    printf("%d\n", square(8));           /* 8^2 = 64     */
    return 0;
}
```

```output
16
64
```

*Click **next →** to see exactly what C does - and doesn't do - with the arguments you pass.*

