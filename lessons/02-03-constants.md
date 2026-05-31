---
id: 02-03-constants
chapter: 2
label: "2.3"
title: Constants
prev: ex-2-1
next: 02-04-declarations
status: done
---

A constant is a literal value baked into the program text. Its *type* and *spelling* tell the compiler how to encode the bytes. Integer constants can be written in decimal, **octal** (leading `0`), or **hexadecimal** (leading `0x`); suffixes (`U`, `L`) pin down the type; floating constants use a decimal point or exponent; character constants like `'A'` are small integers (the [ASCII](https://en.wikipedia.org/wiki/ASCII) code); and string literals are `'\0'`-terminated `char` arrays.

## Three bases, one value

`31`, `037`, and `0x1f` are the *same* integer written three ways. The base is a lexical convention; the stored bits are identical. Suffixes change the type, which matters for overflow and format strings:

```c:run literals and their spellings
#include <stdio.h>

int main(void) {
    int dec = 31, oct = 037, hex = 0x1f;     /* all equal 31 */
    printf("%d %d %d\n", dec, oct, hex);

    long big = 123456789L;     /* L -> long */
    unsigned u = 40000U;       /* U -> unsigned */
    double d = 1.5e3;          /* exponent form: 1500.0 */
    printf("%ld %u %g\n", big, u, d);
    return 0;
}
```

```output
31 31 31
123456789 40000 1500
```

The octal trap: a stray leading zero changes meaning. `010` is **8**, not 10 — a real bug when people pad numbers with zeros. Hex is the everyday tool for bit patterns because each digit maps to exactly 4 bits.

## Character constants are integers

`'A'` is not a "character object" — it's the `int` value 65. That's why `'0'` through `'9'` being contiguous lets you do `digit - '0'`, and why `'\n'`, `'\t'`, `'\0'` (escape sequences) are just compact ways to write specific byte values. A string constant `"hi"` is different: it's an array of those bytes plus a terminating `'\0'`, stored in read-only memory and represented at use by the address of its first byte.

The `#define` and `enum` mechanisms create *named* constants — covered in [Symbolic Constants](lesson.html?id=01-04-symbolic-constants) and the preprocessor section — so magic numbers get meaningful names.

## Go deeper
- [Integer constants](https://en.cppreference.com/w/c/language/integer_constant) — bases, suffixes, and resulting types
- [Floating constants](https://en.cppreference.com/w/c/language/floating_constant) — decimal vs exponent forms
- [Escape sequences](https://en.cppreference.com/w/c/language/escape) — `\n`, `\t`, `\0`, `\xHH`, and friends
- [String literals](https://en.cppreference.com/w/c/language/string_literal) — storage, terminator, and immutability
