---
id: 06-chars-and-strings
chapter: 2
label: "2.3"
title: Chars and strings as char arrays
prev: 05-integer-types
next: 07-if-goto-recursion
status: draft
source:
  videoId: SWWHqgSwQFw
  url: https://www.youtube.com/watch?v=SWWHqgSwQFw
---

> **Source video.** [Let's Learn C — lesson 5](https://www.youtube.com/watch?v=SWWHqgSwQFw) by Salvatore Sanfilippo (antirez).

## TL;DR

In C, characters *are* small integers — `'A'` is literally `65`, and a `char` is just a one-byte `int`. A "string" is nothing more than an array of `char` whose end is marked by a single zero byte (`'\0'`, the **NUL terminator**). `printf`'s `%s` is built on top of `%c` and that convention.

## Walkthrough

### `'A'` is 65 `[03:00 → 04:35]`

Single quotes in C don't make strings — they produce a single integer whose value is the character's position in ASCII. `'A'` and `65` are interchangeable as `printf` arguments to `%c`, and `printf("%c", 65 + 1)` prints `B`. This is unlike Python, where `'a'` and `"a"` mean the same thing.

### Arrays and curly-brace initialisation `[09:19 → 11:21]`

A fixed-size array is declared with `T name[N]` and initialised with curly braces:

```c
int a[5] = {10, 5, 50, 107, 0};
printf("%d\n", a[1]);   // → 5
```

Indexing with `[]` is the same convention as later languages inherited, but the *initialiser* syntax with `{...}` is older and C-specific.

### Strings are `char[]` with a trailing zero `[11:21 → 14:52]`

There is no string *type* in C and no length header. A string is an array of `char` that you (or the compiler) terminate with a single zero byte. `printf("%s", str)` walks forward from `str` and stops the instant it sees that zero. Forget the terminator and `%s` will keep printing whatever bytes happen to live next in memory until it stumbles onto one.

### String literals are sugar for that array `[18:24 → 21:11]`

`char str[6] = "hello"` is exactly equivalent to writing the five letters and a `0` by hand — the literal silently appends the NUL byte, which is why `sizeof("hello") == 6`. Drop the size and let the compiler count: `char str[] = "hello"`. The array is still mutable, so `str[3] = 'X'` turns it into `helXo`, and `str[3]++` walks the letter one step up the ASCII table.

### `%s` is just a loop over `%c` `[16:34 → 17:29]`

Once you have internalised "string = `char[]` + NUL", you can write `%s` yourself with the tools from the last lesson.

```c:run reimplement-puts.c
#include <stdio.h>

int main(void) {
    char str[] = "hello";
    int i = 0;
    while (str[i] != 0) {
        printf("%c", str[i]);
        i++;
    }
    printf("\n");
    return 0;
}
```

```output
hello
```

The same `while` would work over `{10, 20, 0}` if you swapped `%c` for `%d` — the loop itself knows nothing special about characters. The NUL terminator is a *convention*, enforced only by whoever reads the array.

### ASCII codes, the other direction `[08:04 → 09:19]`

Going from integer to glyph is just as cheap: pass any value in `0..127` to `%c` and `printf` prints the corresponding character.

```c:run abcd.c
#include <stdio.h>

int main(void) {
    printf("%c%c%c%c\n", 65, 66, 67, 'D');
    return 0;
}
```

```output
ABCD
```

## Modern note

`char` is signed on most platforms (range `-128..127`), so reach for `unsigned char` when you actually want a raw byte. ASCII covers only `0..127`; anything above that is locale- or encoding-dependent, and these days almost certainly UTF-8 — a multi-byte encoding the language itself doesn't understand, so `strlen` counts bytes, not characters.

## Try it

1. Drop the `0` from the end of a hand-built `char str[]` and watch `printf("%s", str)` spray garbage until it randomly hits a zero byte.
2. Replace `%c` with `%d` in the loop above to print the ASCII codes of `"hello"` (you should see `104 101 108 108 111`).
3. Print `sizeof("hello")` with `%lu` and confirm it is `6`, not `5`.

## Cross-reference to K&R

[K&R § 1.9 — Character Arrays](../../kr/lessons/01-09-character-arrays.md) covers exactly this terrain: strings as `char` arrays, the NUL terminator, and `printf` with `%s`. [K&R § 2.3 — Constants](../../kr/lessons/02-03-constants.md) treats character constants like `'A'` more formally.

## Go deeper

- `man ascii` — the table this whole lesson rests on.
- `man 3 printf` — every conversion specifier, including the `%c` / `%s` / `%d` family used here.
- [cppreference: string literals](https://en.cppreference.com/w/c/language/string_literal) — exact rules for the `"..."` sugar, including the implicit NUL.
- *The C Programming Language*, 2nd ed., §1.9 — Kernighan & Ritchie's own treatment of character arrays.
