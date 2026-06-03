---
id: 05-integer-types
chapter: 2
label: "2.2"
title: Integer types in depth
prev: 04-functions-and-expressions
next: 06-chars-and-strings
status: draft
source:
  videoId: YNsXyasn4R4
  url: https://www.youtube.com/watch?v=YNsXyasn4R4
---

> **Source video.** [Impariamo il C — lezione 4](https://www.youtube.com/watch?v=YNsXyasn4R4) by Salvatore Sanfilippo.

## TL;DR

C deliberately refuses to nail down how many bits an `int` is — the language was designed in the '60s to run on everything from an 8-bit Z80 to a 64-bit server, and each compiler picks sizes that suit the target. Use `sizeof` to see what your platform gave you, `limits.h` for the ranges, and `stdint.h` when you really need an exact width.

## Walkthrough

### Why C won't tell you how big `int` is `[00:34 → 02:46]`

In Python, an `int` behaves the same on every machine. In C it doesn't: the standard only says signed integer types must be *at least* a certain size and that `char ≤ short ≤ int ≤ long ≤ long long`. That looseness is the whole point — a single language spec had to fit microcontrollers and supercomputers alike. Anything not preceded by `unsigned` is signed and can hold negative values.

### `sizeof` and the format-string trap `[02:46 → 04:48]`

`sizeof x` gives you the byte size of `x` (or of a type). The catch: it returns `size_t`, not `int`, so passing it to `printf("%d", …)` triggers a warning and, on some platforms, prints garbage. Use `%zu` (the `size_t` specifier added in C99), or cast to `(unsigned long)` and print with `%lu` as Salvatore does in the video.

### The ranges live in `limits.h` `[04:48 → 06:45]`

`#include <limits.h>` and you get `INT_MIN`, `INT_MAX`, `CHAR_MIN`, `LONG_MAX` and friends — the actual minimum and maximum values for *this* compile. They're macros expanded by the preprocessor, so the numbers are baked in at compile time and cost nothing at runtime.

### What you can usually expect, and where `stdint.h` saves you `[07:18 → 13:36]`

In practice, on every mainstream 32/64-bit system: `char` is 1 byte, `short` is 2, `int` is 4, `long long` is 8. `long` is the awkward one — it follows the machine word, so 8 bytes on 64-bit Linux but 4 on Windows or 32-bit targets. When you genuinely need exact widths (file formats, network protocols, hash tables), reach for `<stdint.h>`: `int32_t`, `uint64_t`, `size_t` (the size of any object), `intptr_t` (an integer wide enough to hold a pointer, signed so you can subtract two of them).

### Back to `main`: what a function declaration actually is `[16:29 → 17:42]`

`int main(void) { … }` is just the general form `return_type name(param_list) { body }`. The `void` in the parens means "no parameters"; an empty `()` would mean "I'm not telling you", which is a different (legacy) thing. A *call* is the same name followed by `(args)` — `printf("…")` is one such call; `clear()` would be another if you wrote a `void clear(void)` of your own.

## Inspect your own platform

```c:run sizes and ranges
#include <stdio.h>
#include <limits.h>
#include <stdint.h>

int main(void) {
    printf("char       %zu\n", sizeof(char));
    printf("short      %zu\n", sizeof(short));
    printf("int        %zu\n", sizeof(int));
    printf("long long  %zu\n", sizeof(long long));
    printf("uint64_t   %zu\n", sizeof(uint64_t));
    printf("INT_MIN    %d\n",  INT_MIN);
    printf("INT_MAX    %d\n",  INT_MAX);
    return 0;
}
```

```output
char       1
short      2
int        4
long long  8
uint64_t   8
INT_MIN    -2147483648
INT_MAX    2147483647
```

The first four lines are reliable on every mainstream platform. `sizeof(long)` would print `8` on 64-bit Linux but only `4` here in the browser sandbox (and on Windows) — that's the portability tax Salvatore is warning you about.

## Modern note

The video reaches for `(unsigned long)sizeof(x)` with `%lu` to silence the compiler. Since C99 (1999) you can just write `%zu` and pass `sizeof` directly, which is what the runnable above does. New code should prefer `%zu`; you'll still see the cast-and-`%lu` idiom in older codebases that target pre-C99 compilers.

## Try it

1. Change `%d` to `%u` for `INT_MIN` and re-run — the negative value reinterprets as a huge unsigned number. That's two's-complement reading the same bits two ways.
2. Add `printf("long %zu\n", sizeof(long));` — note how this sandbox's wasm target gives `4`, even though the video shows `8`.
3. Try `printf("%d\n", INT_MAX + 1);` — signed overflow is **undefined behaviour** in C; the compiler is allowed to do anything, and `-O2` often "wraps" it in surprising ways.

## Cross-reference to K&R

K&R covers the same territory, more tersely, in [K&R § 2.2 — Data Types and Sizes](../../kr/lessons/02-02-data-types-and-sizes.md). The book predates `<stdint.h>` (added in C99), so its advice on portable widths is the thing most worth updating with Salvatore's modern take.

## Go deeper

- `man 3 printf` — see the `z` length modifier for `size_t` and the full list of conversion specifiers.
- The Open Group description of `<stdint.h>`: <https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/stdint.h.html>.
- "What every C programmer should know about undefined behavior" by Chris Lattner: <https://blog.llvm.org/2011/05/what-every-c-programmer-should-know.html> — particularly the signed-overflow section relevant to *Try it #3*.

*Click **next →** to dig into functions, parameters, and scope.*
