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

> **Source video.** [Let's Learn C - lesson 4](https://www.youtube.com/watch?v=YNsXyasn4R4) by Salvatore Sanfilippo (antirez).

## TL;DR

C deliberately refuses to nail down how many bits an `int` is - the language was designed in the '60s to run on everything from an 8-bit Z80 to a 64-bit server, and each compiler picks sizes that suit the target. Use `sizeof` to see what your platform gave you, `limits.h` for the ranges, and `stdint.h` when you really need an exact width.

## Why C won't tell you how big `int` is `[00:34 → 02:46]`

In Python, an `int` behaves the same on every machine. In C it doesn't: the standard only says signed integer types must be *at least* a certain size and that `char ≤ short ≤ int ≤ long ≤ long long`. That looseness is the whole point - a single language spec had to fit an 8-bit Z80 and a 64-bit supercomputer alike. Anything not preceded by `unsigned` is signed and can hold negative values.

## `sizeof` and the format-string trap `[02:46 → 04:48]`

`sizeof x` gives you the byte size of `x` (or of a type). The catch: it returns `size_t`, not `int`, so passing it to `printf("%d", …)` triggers a warning and, on some platforms, prints garbage:

```c
#include <stdio.h>

int main(void) {
    int x = 5;
    printf("int is %d bytes\n", sizeof(x));
    return 0;
}
```

```output
warn.c: In function ‘main’:
warn.c:5:21: warning: format ‘%d’ expects argument of type ‘int’, but argument 2 has type ‘long unsigned int’ [-Wformat=]
    5 |     printf("int is %d bytes\n", sizeof(x));
      |                    ~^           ~~~~~~~~~
      |                     |           |
      |                     int         long unsigned int
      |                    %ld
```

The fix is `%zu` (the `size_t` specifier added in C99), or cast to `(unsigned long)` and print with `%lu` as Salvatore does in the video.

## The ranges live in `limits.h` `[04:48 → 06:45]`

`#include <limits.h>` and you get `INT_MIN`, `INT_MAX`, `CHAR_MIN`, `LONG_MAX` and friends - the actual minimum and maximum values for *this* compile. They're macros expanded by the preprocessor, so the numbers are baked in at compile time and cost nothing at runtime.

## Inspect your own platform

Put `sizeof` and `limits.h` together and let the compiler tell you what it actually picked:

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

The first four lines are reliable on every mainstream platform. `sizeof(long)` would print `8` on 64-bit Linux but only `4` here in the browser sandbox (and on Windows) - that's the portability tax Salvatore is warning you about. `%zu` passes `sizeof` straight through; the cast-and-`%lu` idiom from the video is the pre-C99 way of saying the same thing.

## What you can usually expect, and where `stdint.h` saves you `[07:18 → 13:36]`

In practice, on every mainstream 32/64-bit system: `char` is 1 byte, `short` is 2, `int` is 4, `long long` is 8. `long` is the awkward one - it follows the machine word, so 8 bytes on 64-bit Linux but 4 on Windows or 32-bit targets. When you genuinely need exact widths (file formats, network protocols, hash tables), reach for `<stdint.h>`: `int32_t`, `uint64_t`, `size_t` (the size of any object), `intptr_t` (an integer wide enough to hold a pointer, signed so you can subtract two of them).

## Back to `main`: what a function declaration actually is `[16:29 → 17:42]`

`int main(void) { … }` is just the general form `return_type name(param_list) { body }`. The `void` in the parens means "no parameters"; an empty `()` would mean "I'm not telling you", which is a different (legacy) thing. A *call* is the same name followed by `(args)` - `printf("…")` is one such call; `clear()` would be another if you wrote a `void clear(void)` of your own.

## Finding an escape sequence with `hexdump` `[18:06 → 20:56]`

To make that `clear()` actually clear the screen, Salvatore needs the terminal's *clear* escape sequence - but doesn't remember it. Instead of looking it up, he pipes the output of the `clear` command straight into `hexdump -C` and reads the raw bytes off:

```
clear | hexdump -C
```

```output
00000000  1b 5b 48 1b 5b 32 4a 1b  5b 33 4a                 |.[H.[2J.[3J|
0000000b
```

The `1b` bytes are **ESC** (decimal 27); each `1b 5b ...` is an `ESC [` control sequence the terminal acts on instead of printing. Here they are `ESC [ H` (cursor home), `ESC [ 2J` (erase the screen), and `ESC [ 3J` (erase the scrollback). So a `clear()` of your own is just a `printf` of those bytes:

```c
void clear(void) {
    printf("\033[2J");   /* \033 is octal 27 = 0x1B = ESC; \x1B is the same byte */
}
```

`\033` writes the escape byte in octal and `\x1B` writes the identical byte in hex - two spellings of one value. The same `hexdump -C` trick works on any output, including your compiled `a.out`: hex on the left, printable characters on the right.

## Two's complement: one bit pattern, two readings

Signed and unsigned are not two different storages - they are two ways of *reading the same bits*. An 8-bit byte holding `1111 1111` is `255` if you call it `unsigned` and `-1` if you call it signed, because signed integers use **two's complement**: the top bit carries negative weight. Reinterpret the same byte both ways and add one past the top:

```c:run two readings
#include <stdio.h>
#include <stdint.h>

int main(void) {
    int8_t  s = -1;
    uint8_t u = (uint8_t)s;
    printf("signed   -1 as bits: %d\n", (unsigned char)s);
    printf("unsigned  u value  : %u\n", u);
    int8_t a = 127;
    printf("127 + 1 (int8_t)   : %d\n", (int8_t)(a + 1));
    return 0;
}
```

```output
signed   -1 as bits: 255
unsigned  u value  : 255
127 + 1 (int8_t)   : -128
```

`-1` and `255` share the bit pattern `0xFF`; `127` (`0x7F`) plus one rolls into `0x80`, whose top bit makes it `-128`. That one-bit difference is the whole story, and it shows up in the generated code too. Compile `int s(signed char)` and `int u(unsigned char)` with `gcc -O2 -masm=intel`:

```asm
s:                          ; int s(signed char x)   { return x; }
        endbr64
        movsx   eax, dil    ; sign-extend 8 -> 32 bits (top bit replicated)
        ret
u:                          ; int u(unsigned char x) { return x; }
        endbr64
        movzx   eax, dil    ; zero-extend 8 -> 32 bits (top bits cleared)
        ret
```

Same C, **different instruction**: `movsx` copies the sign bit upward so `(signed char)-1` stays `-1` as an `int`; `movzx` pads with zeros so `(unsigned char)0xFF` becomes `255`. Three letters in the opcode are the entire signed-vs-unsigned distinction at the silicon level.

## Overflow wraps, and mixing signs bites

Because the bits are finite, counting past the top of the range falls off the bottom. For *unsigned* types this wraparound is fully defined - `255 + 1 == 0`:

```c:run unsigned wrap
#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t b = 250;
    for (int i = 0; i < 8; i++) {
        printf("b = %u\n", b);
        b++;
    }
    return 0;
}
```

```output
b = 250
b = 251
b = 252
b = 253
b = 254
b = 255
b = 0
b = 1
```

For *signed* types the same overflow is **undefined behaviour** - the compiler may assume it never happens and optimise accordingly, so never rely on signed wraparound. The other trap is comparing the two families. In `s < u`, C converts the signed `s` to unsigned before comparing, so a negative value becomes huge:

```c:run sign mismatch
#include <stdio.h>

int main(void) {
    int s = -1;
    unsigned int u = 1;
    if (s < u)
        printf("-1 < 1\n");
    else
        printf("-1 is NOT less than 1 ?!\n");
    return 0;
}
```

```output
-1 is NOT less than 1 ?!
```

`-1` converts to `4294967295`, which is not less than `1`. Compile with `-Wall -Wextra` and the compiler will flag the mismatched comparison before it surprises you at runtime.
