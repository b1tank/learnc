---
id: 32-variadic-functions
chapter: 9
label: "9.8"
title: Functions with a variable number of arguments
prev: 31-reference-counting-deep-dive
next: 33-toy-forth-first-program
status: draft
source:
  videoId: cvWbCx0lLjs
  url: https://www.youtube.com/watch?v=cvWbCx0lLjs
---

> **Source video.** [Let's Learn C - lesson 28](https://www.youtube.com/watch?v=cvWbCx0lLjs) by Salvatore Sanfilippo (antirez).

## TL;DR

C lets a function take a variable number of arguments via the `...` syntax and the `<stdarg.h>` macros (`va_list`, `va_start`, `va_arg`, `va_end`). The callee has **no idea** what types or how many arguments were actually passed - it has to be told, either by a format string (the `printf` model) or a sentinel value. Every `va_start` must be paired with a `va_end`.

## Walkthrough

### The `...` syntax `[03:06 → 04:12]`

Declare the fixed arguments, then end the list with three dots: `int foo(const char *fmt, ...)`. That's the only *syntactic* part of variadics. Everything else - pulling values out, knowing when to stop - happens through ordinary macros in `<stdarg.h>`.

### Reading arguments with `va_list` `[04:12 → 05:29]`

Inside the function: declare `va_list ap`, call `va_start(ap, fmt)` passing the **name of the last fixed argument**, then call `va_arg(ap, T)` once per value - where `T` is the type you expect. Finish with `va_end(ap)`. The macros may walk the stack, a register file, or something more exotic depending on the ABI - that's why they exist instead of plain pointer arithmetic.

### The `foo(fmt, ...)` printf-in-miniature `[08:15 → 10:10]`

The first worked example is a stripped-down `printf` whose format string understands only `i` (an `int`) and `s` (a `char *`). Walk the format one character at a time and pull the matching type out with `va_arg`:

```c:run
#include <stdio.h>
#include <stdarg.h>

void foo(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    for (const char *p = fmt; *p; p++) {
        if (*p == 'i') {
            int i = va_arg(ap, int);
            printf("%d\n", i);
        } else if (*p == 's') {
            char *s = va_arg(ap, char*);
            printf("%s\n", s);
        }
    }
    va_end(ap);
}

int main(void) {
    foo("iisi", 10, 20, "hello hello", 5);
    return 0;
}
```

```output
10
20
hello hello
5
```

The format string `"iisi"` is the contract: two ints, a string, an int. `foo` has no other way to know - each `va_arg` just advances by `sizeof(int)` or `sizeof(char*)` exactly as the type it's told to expect.

### Why you must name the type at every `va_arg` `[11:40 → 13:04]`

C keeps no runtime descriptor of what was passed. `va_arg(ap, int)` just advances by the size of an `int`; `va_arg(ap, char*)` by the size of a pointer. Lie about the type and you either read garbage or segfault - and the compiler will not warn you. (The `printf` format-string warning is a GCC/Clang extension, not part of the language.)

### Forwarding to another variadic: the `v*` family `[14:28 → 16:34]`

You cannot pass `...` to another `...` function. Instead, every variadic in the standard library has a `v`-prefixed twin that takes a `va_list`: `vprintf`, `vsnprintf`, `vfprintf`. That's how you write a `printf`-like wrapper - your wrapper accepts `...`, builds a `va_list`, and hands it off.

### A real wrapper: a lowercase `printf` `[16:46 → 19:28]`

Why reach for `vsnprintf` instead of `vprintf`? Because once the formatted text lands in a buffer you can post-process it. Here's a `printf` that lowercases everything it prints - format the arguments into `my_buffer`, then fold the whole buffer with `tolower` before emitting it:

```c:run
#include <stdio.h>
#include <stdarg.h>
#include <ctype.h>

void foo(const char *fmt, ...) {
    char my_buffer[32];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(my_buffer, sizeof(my_buffer), fmt, ap);
    va_end(ap);
    for (size_t j = 0; j < sizeof(my_buffer); j++)
        my_buffer[j] = tolower(my_buffer[j]);
    printf("%s\n", my_buffer);
}

int main(void) {
    foo("Values: %d and %d, also %s", 10, 20, "HELLO");
    return 0;
}
```

```output
values: 10 and 20, also hello
```

`vsnprintf` formats into `my_buffer` exactly as `printf` would have written to the screen, so the lowercase pass happens *after* formatting - even the literal `HELLO` passed as an argument comes out folded. Swap the loop for a centering pass (`strlen` the result, print `(80 - len) / 2` leading spaces) and the same wrapper centres text in an 80-column terminal.

## A variadic sum

```c:run
#include <stdio.h>
#include <stdarg.h>

int sum_ints(int n, ...) {
    va_list ap;
    va_start(ap, n);
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += va_arg(ap, int);
    }
    va_end(ap);
    return total;
}

int main(void) {
    printf("sum=%d\n", sum_ints(5, 1, 2, 3, 4, 5));
    return 0;
}
```

```output
sum=15
```

The first fixed argument `n` tells the callee how many `int`s to expect - without it, `sum_ints` would have no way to know when to stop calling `va_arg`. A `printf`-style format string and a `NULL`-terminated list are the other two common conventions.

## Modern note

C99 added the `__VA_ARGS__` preprocessor token for variadic *macros* - a different mechanism with the same goal: write `LOG(fmt, ...)` that expands to `fprintf(stderr, fmt, __VA_ARGS__)`. C is still not type-safe across variadics, which is why C++ replaced the whole pattern with **parameter packs** (`template<typename... Args>`): the compiler knows every type at every call site and can check `printf`-style functions for real.

## Try it

1. Add a 6th value to the call without bumping `n`. The extra argument is silently ignored.
2. Lie about the count: `sum_ints(8, 1, 2, 3)`. Watch the garbage (or crash) - no compiler warning.
3. Rewrite the loop to stop on a sentinel: drop `n`, end the call with `-1`, and read until `va_arg(ap, int) == -1`.

## Cross-reference to K&R

[K&R § 7.3 - Variable-Length Argument Lists](../../kr/lessons/07-03-variable-length-argument-lists.md) walks through a tiny `minprintf` along exactly these lines - the macros and the calling conventions haven't changed in forty years.

## Go deeper

- `man 3 stdarg` - the macros, in their original Unix wording.
- [cppreference: variadic functions in C](https://en.cppreference.com/w/c/variadic) - the full set of macros plus the surprising lifetime rules (`va_copy`, second traversal, what's undefined).
- glibc's `vfprintf` source - see how a production variadic walks the format string and dispatches to the right `va_arg` type.

*Click **next →** to start building the Toy Forth interpreter.*
