---
id: 02-01-variable-names
chapter: 2
label: "2.1"
title: Variable Names
prev: ex-1-24
next: 02-02-data-types-and-sizes
status: done
---

C is parsimonious about what a name can be — and surprisingly relaxed about what *should* be a name. The language sets the rules; convention does the heavy lifting.

## The mechanical rules

A name is a letter or underscore followed by any combination of letters, digits, and underscores. Names that begin with an underscore are technically legal but are reserved by convention for the standard library and the compiler — don't start your own variables that way.

Names are case-sensitive: `count`, `Count`, and `COUNT` are three different identifiers. Compilers must distinguish at least the first 31 characters of an internal identifier; for external names (linker-visible symbols) the old guarantee was just 6 case-insensitive characters, which is why a lot of standard-library function names look terse (`strncmp`, `getc`).

```c:starter
#include <stdio.h>

int main(void) {
    int   apples         = 3;
    int   golden_apples  = 5;
    int   APPLES         = 7;   /* legal, distinct, but please don't */
    int   _reserved      = 9;   /* legal, reserved by convention */

    printf("%d %d %d %d\n", apples, golden_apples, APPLES, _reserved);
    return 0;
}
```

```output
3 5 7 9
```

## Convention beats the rulebook

- **Lowercase with underscores** for variables and most functions: `read_line`, `buffer_size`.
- **ALL_CAPS** for macros and symbolic constants: `MAXLINE`, `EOF`.
- **PascalCase** is rare in C; you'll see it in some Microsoft-flavoured codebases.
- Reserved words (`int`, `for`, `if`, `return`, etc.) can't be used as names.

Use names that read like the thing they describe. `n` for "number of something" inside a tight loop is fine; `i`, `j`, `k` for loop indices is fine. Three-letter mystery names for module-level globals are not.

## Modern note

C99 introduced the `_Bool` type (typedef'd as `bool` in `<stdbool.h>`); C11 added `_Static_assert`. Any new identifier you invent that starts with an underscore followed by an uppercase letter, or with double underscore, is reserved *by the implementation* — you can step on the compiler's toes without realising. Stay away from leading underscores in your own code.

## Try it

1. Change one name to start with a digit and try to compile. The error message names the rule precisely.
2. Declare both `int sum` and `int Sum` in the same function. Note that the compiler treats them as completely independent.
3. Try `int int;`. See what the compiler calls that.

## Notes from the author

- The K&R "31-character" guarantee feels archaic today; modern compilers honour much longer names. But the *external* limit (link-visible names) is what bites you in cross-platform code. If you ship a library that has to link cleanly with a 1990s C runtime, keep the first ~8 chars of every public symbol unique.
- The single most important rule is the one the language won't enforce for you: **names should be self-explanatory at the call site, not the definition site**. `find(x, 3)` is mystery; `find_index(haystack, needle)` is documentation.
- Hungarian notation (`iCount`, `pszName`) is a relic of pre-IDE editors. Don't bring it back. Type information belongs in the declaration, not the name.

*Click **next →** to enumerate the built-in numeric types.*
