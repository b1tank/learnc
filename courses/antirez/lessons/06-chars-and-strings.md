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

> **Source video.** [Let's Learn C - lesson 5](https://www.youtube.com/watch?v=SWWHqgSwQFw) by Salvatore Sanfilippo (antirez).

## TL;DR

In C, characters *are* small integers - `'A'` is literally `65`, and a `char` is just a one-byte `int`. A "string" is nothing more than an array of `char` whose end is marked by a single zero byte (`'\0'`, the **NUL terminator**). `printf`'s `%s` is built on top of `%c` and that convention.

## `'A'` is 65 `[03:00 → 04:35]`

Single quotes in C don't make strings - they produce a single integer whose value is the character's position in ASCII. `'A'` and `65` are interchangeable as `printf` arguments to `%c`, and `printf("%c", 65 + 1)` prints `B`. This is unlike Python, where `'a'` and `"a"` mean the same thing.

## ASCII codes, the other direction `[08:04 → 09:19]`

Going from integer to glyph is just as cheap: pass any value in `0..127` to `%c` and `printf` prints the corresponding character. Mixing literal codes and character literals shows they are the same thing:

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

`'D'` is just another way of writing `68`, so all four arguments are plain integers.

## Arrays and curly-brace initialisation `[09:19 → 11:21]`

A fixed-size array is declared with `T name[N]` and initialised with curly braces:

```c
int a[5] = {10, 5, 50, 107, 0};
printf("%d\n", a[1]);   // → 5
```

Indexing with `[]` is the same convention as later languages inherited, but the *initialiser* syntax with `{...}` is older and C-specific.

## Strings are `char[]` with a trailing zero `[11:21 → 14:52]`

There is no string *type* in C and no length header. A string is an array of `char` that you (or the compiler) terminate with a single zero byte. `printf("%s", str)` walks forward from `str` and stops the instant it sees that zero. Forget the terminator and `%s` will keep printing whatever bytes happen to live next in memory until it stumbles onto one.

## String literals are sugar for that array `[18:24 → 21:11]`

`char str[6] = "hello"` is exactly equivalent to writing the five letters and a `0` by hand - the literal silently appends the NUL byte, which is why `sizeof("hello") == 6`. Drop the size and let the compiler count: `char str[] = "hello"`. Give it too few slots and the compiler complains, because the NUL no longer fits:

```c
#include <stdio.h>

int main(void) {
    char str[4] = "hello";
    printf("%s\n", str);
    return 0;
}
```

```output
toolong.c: In function ‘main’:
toolong.c:4:19: warning: initializer-string for array of ‘char’ is too long
    4 |     char str[4] = "hello";
      |                   ^~~~~~~
```

The array is still mutable, so `str[3] = 'X'` turns `"hello"` into `helXo`, and `str[3]++` walks that letter one step up the ASCII table.

## `%s` is just a loop over `%c` `[16:34 → 17:29]`

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

The same `while` would work over `{10, 20, 0}` if you swapped `%c` for `%d` - the loop itself knows nothing special about characters. The NUL terminator is a *convention*, enforced only by whoever reads the array.

## Look at the bytes: the NUL terminator in memory

The terminator is not an abstraction - it is a real `0x00` byte sitting one slot past the last letter. Walk every slot of the array, including the one the literal added for you, and print its hex value, decimal value, and glyph:

```c:run byte dump
#include <stdio.h>

int main(void) {
    char str[] = "hello";
    for (int i = 0; i < (int)sizeof(str); i++) {
        printf("str[%d] = 0x%02x  (%3d)  '%c'\n",
               i, (unsigned char)str[i], str[i],
               str[i] ? str[i] : ' ');
    }
    return 0;
}
```

```output
str[0] = 0x68  (104)  'h'
str[1] = 0x65  (101)  'e'
str[2] = 0x6c  (108)  'l'
str[3] = 0x6c  (108)  'l'
str[4] = 0x6f  (111)  'o'
str[5] = 0x00  (  0)  ' '
```

Six slots for five letters: `0x68 0x65 0x6c 0x6c 0x6f` are the ASCII codes of `h e l l o`, and `0x00` at index 5 is the NUL the string literal appended. That zero is what every `%s`, `strlen`, and string-copy function scans for. Note `0x00` is *not* the digit `'0'`, whose code is `0x30` (48) - they are different bytes entirely.

## `sizeof` counts slots, `strlen` counts letters

Because the terminator occupies a real slot, the two ways of measuring a string disagree by exactly one. `sizeof` is the compile-time size of the whole array (letters plus NUL); `strlen` is a runtime walk that counts bytes *up to but not including* the NUL:

```c:run sizeof vs strlen
#include <stdio.h>
#include <string.h>

int main(void) {
    char str[] = "hello";
    printf("sizeof = %zu\n", sizeof(str));
    printf("strlen = %zu\n", strlen(str));
    return 0;
}
```

```output
sizeof = 6
strlen = 5
```

`sizeof` knows the array is 6 bytes because the compiler counted the slots; `strlen` returns 5 because it stopped at the terminator. Swap `%c` for `%d` in the earlier loop and you can print the codes directly - `104 101 108 108 111` - confirming the same five bytes `strlen` walked.

## `char` signedness and beyond ASCII

`char` is signed on most platforms (range `-128..127`), so reach for `unsigned char` when you actually want a raw byte - which is why the byte dump above casts to `(unsigned char)` before printing hex. ASCII covers only `0..127`; anything above that is locale- or encoding-dependent, and these days almost certainly UTF-8, a multi-byte encoding the language itself doesn't understand. That is why `strlen` counts bytes, not characters: a UTF-8 `é` is two bytes, so `strlen` reports `2` for a one-character string.
