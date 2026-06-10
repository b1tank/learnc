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

C lets a function take a variable number of arguments via the `...` syntax and the `<stdarg.h>` macros (`va_list`, `va_start`, `va_arg`, `va_end`). The callee has no idea what types or how many arguments were actually passed - it has to be told, either by a format string (the `printf` model) or a sentinel value. Every `va_start` must be paired with a `va_end`.

## The `...` syntax `[03:06 → 04:12]`

Declare the fixed arguments, then end the list with three dots: `void foo(const char *fmt, ...)`. That tells C the function can take, beyond the listed arguments, any number more in variable count. That is the only syntactic part of variadics. Everything else - pulling values out, knowing when to stop - happens through ordinary macros in `<stdarg.h>`.

## Reading arguments with `va_list` `[04:12 → 05:29]`

Inside the function: declare `va_list ap`, call `va_start(ap, fmt)` passing the name of the last fixed argument, then call `va_arg(ap, T)` once per value - where `T` is the type you expect. Finish with `va_end(ap)`, which invalidates `ap`. Every `va_start` must be matched by a `va_end` in the same function; the macros may walk the stack, a register file, or something more exotic depending on the ABI, which is exactly why they exist instead of plain pointer arithmetic.

## The `foo(fmt, ...)` printf-in-miniature `[08:15 → 10:10]`

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

The format string `"iisi"` is the contract: two ints, a string, an int. `foo` has no other way to know - each `va_arg` just advances by `sizeof(int)` or `sizeof(char*)` exactly as the type it is told to expect.

## Why you must name the type at every `va_arg` `[11:40 → 13:04]`

C keeps no runtime descriptor of what was passed - there is no argument vector to inspect. `va_arg(ap, int)` just advances by the size of an `int`; `va_arg(ap, char*)` by the size of a pointer. Lie about the type and you read garbage or segfault, and the compiler will not warn you. (The `printf` format-string warning is a GCC/Clang extension, not part of the language.) In the video, swapping the two leading ints for a string still compiles cleanly, prints a couple of numbers, then promptly segfaults - the state is corrupted because the sizes no longer line up.

## Forwarding to another variadic: the `v*` family `[14:28 → 16:34]`

You cannot pass `...` to another `...` function. Instead, every variadic in the standard library has a `v`-prefixed twin that takes a `va_list`: `vprintf`, `vsnprintf`, `vfprintf`. That is how you write a `printf`-like wrapper - your wrapper accepts `...`, builds a `va_list` with `va_start`, and hands it straight to `vprintf(fmt, ap)`. Mark the format parameter `const` to match `printf`'s signature.

## A real wrapper: a lowercase `printf` `[16:46 → 19:28]`

Why reach for `vsnprintf` instead of `vprintf`? Because once the formatted text lands in a buffer you can post-process it. Here is a `printf` that lowercases everything it prints - format the arguments into `my_buffer`, then fold the whole buffer with `tolower` before emitting it:

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

`vsnprintf` formats into `my_buffer` exactly as `printf` would have written to the screen, so the lowercase pass happens after formatting - even the literal `HELLO` passed as an argument comes out folded. Swap the loop for a centering pass (`strlen` the result, print `(80 - len) / 2` leading spaces) and the same wrapper centres text in an 80-column terminal.

## A variadic sum

The `printf` family carries the type information in the format string. The other common convention is a leading count: a `sum(int count, ...)` whose first fixed argument says how many `int`s follow. Without it the callee would have no way to know when to stop calling `va_arg`:

```c:run
#include <stdio.h>
#include <stdarg.h>

int sum(int count, ...) {
    va_list ap;
    va_start(ap, count);
    int total = 0;
    for (int i = 0; i < count; i++)
        total += va_arg(ap, int);
    va_end(ap);
    return total;
}

int main(void) {
    printf("sum=%d\n", sum(5, 1, 2, 3, 4, 5));
    return 0;
}
```

```output
sum=15
```

`count` is the contract here, the way `"iisi"` was above. The third common convention is a `NULL`- or sentinel-terminated list: drop `count`, end the call with a marker value, and read until `va_arg` returns it.

## Default argument promotions

There is a subtle ABI rule hiding in `va_arg`: arguments passed through `...` undergo the *default argument promotions*. A `float` is promoted to `double`, and any integer type narrower than `int` (a `char`, a `short`) is promoted to `int` before the call. So you must read a passed `float` with `va_arg(ap, double)`, and a passed `char` with `va_arg(ap, int)` - asking for the narrow type is undefined behaviour. The runnable below passes a `char` and a `float` but reads them back as `int` and `double`:

```c:run
#include <stdio.h>
#include <stdarg.h>

void show(int count, ...) {
    va_list ap;
    va_start(ap, count);
    for (int i = 0; i < count; i++) {
        if (i == 0) {
            int c = va_arg(ap, int);        /* a char arrives promoted to int */
            printf("char as int: %d\n", c);
        } else {
            double d = va_arg(ap, double);  /* a float arrives promoted to double */
            printf("float as double: %g\n", d);
        }
    }
    va_end(ap);
}

int main(void) {
    char ch = 'A';
    float f = 2.5f;
    show(2, ch, f);
    return 0;
}
```

```output
char as int: 65
float as double: 2.5
```

The `'A'` comes back as its integer code `65`, and `2.5f` round-trips as a `double`. This is also why `printf` has no `%` conversion that reads a `float` directly: by the time the value reaches the callee it is already a `double`, which is what `%f` expects.
