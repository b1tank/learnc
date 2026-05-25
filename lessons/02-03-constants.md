---
id: 02-03-constants
chapter: 2
label: "2.3"
title: Constants
prev: ex-2-1
next: 02-04-declarations
status: done
---

A *constant* is a literal value you write directly in source code: `42`, `3.14`, `'A'`, `"hello"`. Every constant has a type, and the syntax of the literal often determines that type.

## Integer constants

- `123` — `int`
- `123L` — `long`
- `123U` — `unsigned int`
- `123UL` — `unsigned long`
- `0x1F` — hexadecimal `int` (31)
- `017` — **octal** `int` (15) — note the leading zero
- `123LL` — `long long` (C99+)

The octal trap: `010` is **eight**, not ten. Stripping accidental leading zeros from numeric literals is a common bug source.

## Floating-point constants

- `3.14` — `double`
- `3.14f` — `float`
- `3.14L` — `long double`
- `1e6` — `double` (one million)
- `2.5e-3` — `double` (0.0025)

## Character constants

A character constant is a single quote around a character: `'A'`, `'\n'`, `'\t'`. Its type is **`int`**, not `char` — this is a subtle but important inheritance from K&R-era C. Its value is the character's encoding (usually ASCII): `'A'` is `65`, `'0'` is `48`.

Escape sequences cover the non-printable ones: `\n` `\t` `\\` `\'` `\"` `\0` `\a` `\b` `\r` `\v` `\f` and `\xNN` for arbitrary hex.

## String literals

A string literal is double-quoted: `"hello"`. It is a `char` array, automatically terminated with `'\0'`. So `"hello"` is six bytes, not five. Adjacent string literals are concatenated at compile time: `"foo" "bar"` is exactly `"foobar"`.

## Enumeration constants

```c
enum colors { RED, GREEN, BLUE };
```

Gives you three integer constants — `RED = 0`, `GREEN = 1`, `BLUE = 2`. You can override: `enum { TWO = 2, FOUR = 4 };`. Enum values are `int`.

```c:starter
#include <stdio.h>

enum colors { RED, GREEN, BLUE };

int main(void) {
    int  hex_val  = 0xFF;
    int  oct_val  = 0777;      /* octal 0777 = 511 decimal */
    long big      = 1000000L;
    double pi     = 3.14159;
    char letter   = 'A';
    char *greet   = "hello";   /* string literal */

    printf("hex 0xFF      = %d\n", hex_val);
    printf("oct 0777      = %d\n", oct_val);
    printf("'A'           = %d (its ASCII code)\n", letter);
    printf("GREEN         = %d\n", GREEN);
    printf("string        = %s (length %zu, sizeof %zu)\n",
           greet, sizeof(greet), sizeof("hello"));
    printf("big number    = %ld\n", big);
    printf("pi            = %f\n", pi);
    return 0;
}
```

```output
hex 0xFF      = 255
oct 0777      = 511
'A'           = 65 (its ASCII code)
GREEN         = 1
string        = hello (length 8, sizeof 6)
big number    = 1000000
pi            = 3.141590
```

(The string's `sizeof` includes the trailing `\0`; `sizeof(greet)` here prints 8 because `greet` is a pointer, not the array — see chapter 5.)

## Modern note

In new C code, prefer `enum` over `#define` for related integer constants. The enum names participate in the type system and can be inspected by a debugger; macros are textual substitutions invisible after preprocessing.

For "named values that aren't a small enum," `static const int MAX = 100;` works in C99+ and gives proper scoping and types.

## Try it

1. Print `0123` vs `123`. The first one is octal, the second decimal.
2. Compute `sizeof("hello")`. The answer should be 6.
3. Define an enum with an explicit value in the middle: `enum { A, B = 10, C };`. Print all three.

## Notes from the author

- The fact that `'A'` is `int` and not `char` is one of those K&R-era decisions that was sensible at the time and now causes confusion. It's why `sizeof('A')` is 4 (or whatever `sizeof(int)` is on your box), not 1.
- Adjacent-string concatenation is the cleanest way to write long string literals: each line stays under 80 chars and the compiler joins them. C++ users sometimes use raw string literals; C99 doesn't have them.
- Watch the octal trap. If you write an IP-like literal `192.168.0.001`, the `001` is a separate token (decimal 1, since it has no operator following), but `0001` in something like an array initialiser would be octal-1, which equals decimal 1 — luckily the same. Try `0x0123` instead; never a surprise.

*Click **next →** to look at the syntax of declarations.*
