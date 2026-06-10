---
id: 18-string-design-and-hexdump
chapter: 7
label: "7.3"
title: More on structures, string-design choices, hexdump()
prev: 17-strings-with-reference-counting
next: 19-algorithm-archaeology
status: draft
source:
  videoId: grkIJjw6o18
  url: https://www.youtube.com/watch?v=grkIJjw6o18
---

> **Source video.** [Let's Learn C - lesson 17](https://www.youtube.com/watch?v=grkIJjw6o18) by Salvatore Sanfilippo (antirez).

## TL;DR

When you design a small string type around `struct { size_t len; char data[]; }`, three design knobs matter: where the length lives, whether you point at the bytes (`char *str`) or inline them with a **flexible array member** (the trailing `char data[]`), and whether you keep a trailing `\0` so existing libc calls still work. A 30-line `hexdump()` is the quickest way to *see* those choices laid out in memory.

## Walkthrough

### `char str[]` vs `char *str` `[01:39 → 02:45]`

These look similar but mean very different things. `char *str` is an 8-byte pointer stored inside the struct; the characters live somewhere else - a separate `malloc`, a separate `free`, an extra pointer chase on every access. `char str[]`, the **flexible array member** (legal at the end of a struct since C99), is *not* stored at all: it's a symbolic offset that names "the bytes immediately after the struct". One `malloc(sizeof(hdr) + n)` allocates header *and* payload in a single block.

### Layout, byte by byte `[05:26 → 06:24]`

On a 64-bit machine, `struct { int len; char *str; }` actually occupies 16 bytes, not 12: there are 4 bytes of *padding* between them because pointers must be 8-byte aligned. Switching `int` to `long` (or `size_t`) makes the layout match what you'd draw on paper. Padding is invisible unless you go looking for it - which is exactly what `hexdump()` is for.

### Building hexdump() `[06:24 → 09:40]`

A workable hexdump walks the bytes one at a time and emits three columns: the offset (so you can count without your fingers), the hex value of each byte (`%02x`), and a sidebar of printable characters with non-printables replaced by `.`. Three rules from the demo:

- The address parameter is `const void *`, so callers can pass any pointer type without casting. Internally, cast it to `unsigned char *` so arithmetic is in bytes and values land safely in `0..255`.
- `isprint(c)` from `<ctype.h>` answers "would this byte mess up my terminal if I printed it raw?". The ternary `isprint(c) ? c : '.'` is the textbook use of `?:`.
- Group bytes into lines of 8 or 16 - hardcode it with `#define HEXDUMP_CHARS_PER_LINE`. The off-by-one Salvatore hits live (an extra blank line when `len` is a multiple of the line width) goes away by taking `len % HEXDUMP_CHARS_PER_LINE` before computing trailing padding.

### Don't bake refcounting into your string `[31:49 → 33:27]`

Salvatore's own production string library (Redis's [SDS](https://github.com/antirez/sds)) deliberately has **no** reference count in the string header. Refcounting belongs to the higher-level object that *owns* the string, not to the string itself - otherwise every `redisObject`-style wrapper grows a useless second counter. SDS instead spends header bits on what's actually variable: length, allocated capacity, and a 3-bit type tag that picks between five header sizes (64, 32, 16, 8-bit, and a 5-bit variant for strings ≤ 31 chars, which fit in a single byte of overhead).

### Saturating the refcount `[35:31 → 37:13]`

If you *do* keep a refcount and you intern very common strings ("0", "1", "true", …), what happens when the count overflows `uint32_t`? The trick: pin the maximum as "sticky". Once the refcount reaches `UINT32_MAX`, neither increment nor decrement touches it again. That deliberately leaks the object - but you've already decided it's permanent, so the leak is the feature.

```c:run hexdump
#include <stdio.h>
#include <ctype.h>
#include <stddef.h>

void hexdump(const void *p, size_t len) {
    const unsigned char *b = p;
    for (size_t i = 0; i < len; i += 8) {
        printf("%08zx  ", i);
        for (size_t j = 0; j < 8; j++) {
            if (i + j < len) printf("%02x ", b[i + j]);
            else             printf("   ");
        }
        printf(" |");
        for (size_t j = 0; j < 8 && i + j < len; j++) {
            int c = b[i + j];
            putchar(isprint(c) ? c : '.');
        }
        printf("|\n");
    }
}

int main(void) {
    /* 8 bytes: 'H','e','l','l','o','!','\n','\0' */
    const char s[] = "Hello!\n";
    hexdump(s, sizeof s);
    return 0;
}
```

```output
00000000  48 65 6c 6c 6f 21 0a 00  |Hello!..|
```

Read the line left to right: offset 0, then the six bytes of `"Hello!"` (`H`=0x48, `e`=0x65, `l`=0x6c, `l`=0x6c, `o`=0x6f, `!`=0x21), then the literal `\n` (0x0a), then the implicit `\0` that C appends to every string literal. In the ASCII column the newline and the null both render as `.` because `isprint` rejects them.

### Dumping a struct: padding, junk, and the offset trick `[09:02 → 10:08, 22:30 → 31:03]`

Point `hexdump` at a struct and the design choices become visible. With `struct { long len; char str[]; }` and `len = 10`, the first eight bytes read `0a 00 00 00 00 00 00 00` - the `0a` comes first because x86 is little-endian. Fill the unused tail with `memset(&s, 0xff, sizeof s)` before initialising and the bytes you never wrote show up as `ff`, a quick way to *see* uninitialised memory:

```output
00000000  0a 00 00 00 00 00 00 00  |........|
00000008  31 32 33 ff ff ff ff ff  |123.....|
```

And the flexible array member really is just an offset. Print the struct's own address next to `s.str`:

```c
printf("%p\n", (void *)&s);
printf("%p\n", (void *)s.str);
```

```output
0x7ffd...18
0x7ffd...20
```

`s.str` is exactly eight bytes past `&s` - the size of `len`. There is no pointer stored anywhere; `str` is a symbolic name for "the bytes right after the header," which is why one `malloc(sizeof s + n)` covers both.

## Modern note

`hexdump()` is one of those utilities every C programmer ends up rewriting. The unix command line has had `hexdump -C` (the "canonical" format this code mimics) for decades, and `xxd -i` will turn any file into a C array literal you can `#include` - handy for embedding fonts, shaders, or test fixtures. Layout aside, the function above is almost identical to `od -An -tx1z`.

## Try it

1. Change the literal to `"AB\x00CD"` and re-run - `sizeof` should report 6, and the middle `00` will sit in the hex column with a `.` in the ASCII column.
2. Lift the line width into `#define HEXDUMP_CHARS_PER_LINE 16` and replace the two `8`s. Dump a 40-byte buffer to see the trailing partial line pad correctly.
3. Dump a small `struct { long len; char data[8]; }` and confirm the first 8 bytes are the length (little-endian) followed by the inline payload - no separate `malloc`, no pointer.

## Cross-reference to K&R

[K&R § 5.5 - Character Pointers and Functions](../../kr/lessons/05-05-character-pointers-and-functions.md) covers the same `char *` vs `char []` distinction at the level of function arguments. This episode is the practical continuation: the same question, but for **storage inside a struct**.

## Go deeper

- Redis [`sds.h`](https://github.com/antirez/sds) - the production prefixed-length string library; the header is short and worth reading to see the five-tier struct trick in real code.
- C99 §6.7.2.1¶18 - the standard text that legalises the flexible array member (`char data[];` at the end of a struct). Before C99, GCC offered the same thing as `char data[0];`.
- `man 1 hexdump`, `man 1 xxd`, `man 1 od` - three takes on the same job from the unix toolbox.
- *Pascal strings* and Microsoft's `BSTR` - earlier prefixed-length designs, each with its own size-vs-range trade-off.

*Click **next →** to see how this same library has been reimplemented for fifty years.*
