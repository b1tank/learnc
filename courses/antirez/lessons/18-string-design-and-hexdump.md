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

## `char str[]` vs `char *str` `[01:39 → 02:45]`

These look similar but mean very different things. `char *str` is an 8-byte pointer stored inside the struct; the characters live somewhere else - a separate `malloc`, a separate `free`, an extra pointer chase on every access. `char str[]`, the **flexible array member** (legal at the end of a struct since C99), is *not* stored at all: it is a symbolic offset that names "the bytes immediately after the struct". One `malloc(sizeof(hdr) + n)` allocates header *and* payload in a single block.

## Layout, byte by byte `[05:26 → 06:24]`

On a 64-bit machine, `struct { int len; char *str; }` actually occupies 16 bytes, not 12: there are 4 bytes of *padding* between them because pointers must be 8-byte aligned. Switching `int` to `long` (or `size_t`) makes the layout match what you would draw on paper - 8 bytes of length, then 8 bytes of pointer. Padding is invisible unless you go looking for it, which is exactly what `hexdump()` is for.

## Building hexdump() `[06:24 → 09:40]`

A workable hexdump walks the bytes one at a time and emits three columns: the offset (so you can count without your fingers), the hex value of each byte (`%02x`), and a sidebar of printable characters with non-printables replaced by `.`. Three rules from the demo:

- The address parameter is `const void *`, so callers can pass any pointer type without casting. Internally, cast it to `unsigned char *` so arithmetic is in bytes and values land safely in `0..255`.
- `isprint(c)` from `<ctype.h>` answers "would this byte mess up my terminal if I printed it raw?". The ternary `isprint(c) ? c : '.'` is the textbook use of `?:`.
- Group bytes into lines of 8 or 16 - hardcode it with `#define HEXDUMP_CHARS_PER_LINE`. The off-by-one Salvatore hits live (an extra blank line when `len` is a multiple of the line width) goes away by taking `len % HEXDUMP_CHARS_PER_LINE` before computing trailing padding.

## A working hexdump, end to end

Here is the whole function in one runnable piece, eight bytes per line. The input is fixed so the output is deterministic: the seven characters of `"Hello!\n"` plus the `\0` that C appends to every string literal, eight bytes exactly.

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
    const char s[] = "Hello!\n";   /* 8 bytes incl. the trailing NUL */
    hexdump(s, sizeof s);
    return 0;
}
```

```output
00000000  48 65 6c 6c 6f 21 0a 00  |Hello!..|
```

Read the line left to right: offset 0, then the six bytes of `"Hello!"` (`H`=0x48, `e`=0x65, `l`=0x6c, `l`=0x6c, `o`=0x6f, `!`=0x21), then the literal `\n` (0x0a), then the implicit `\0` (0x00) that closes the literal. In the ASCII column the newline and the null both render as `.` because `isprint` rejects them.

That last `00` is the whole difference between two string designs. A **NUL-terminated** string is found by *scanning* for that `0x00`: the length is implicit, every `strlen` is an O(n) walk, and an embedded zero truncates the string. A **length-prefixed** string (the `struct pls` from the previous lesson) stores the count in the header instead, so the length is an O(1) field read, the bytes can contain `0x00` freely, and the trailing `\0` becomes optional - you keep it only so the buffer can still be handed to legacy libc calls that expect one.

## Dumping a struct: padding, junk, and the offset trick `[09:02 → 31:03]`

Point the same `hexdump` at a struct and the design choices become visible. Fill every byte with `0xff` first, then write only `len` and three characters, so anything you *didn't* initialise shows up as `ff`:

```c:run structdump
#include <stdio.h>
#include <ctype.h>
#include <string.h>
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

struct pls {
    long len;
    char str[16];
};

int main(void) {
    struct pls s;
    memset(&s, 0xff, sizeof s);   /* paint every byte so junk is visible */
    s.len = 10;
    memcpy(s.str, "123", 3);      /* leave the rest at 0xff */
    hexdump(&s, sizeof s);
    return 0;
}
```

```output
00000000  0a 00 00 00 00 00 00 00  |........|
00000008  31 32 33 ff ff ff ff ff  |123.....|
00000010  ff ff ff ff ff ff ff ff  |........|
```

The first eight bytes are `len`: `0a 00 00 00 00 00 00 00`, with the `0a` (=10) first because x86 is little-endian. The bytes you wrote (`31 32 33` = `"123"`) follow, and everything you left untouched still reads `ff` - a quick way to *see* uninitialised memory.

And the flexible array member really is just an offset. Swap `char str[16]` for `char str[]`, over-allocate, and ask how far `str` sits from the start of the header:

```c:run offset
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

struct pls {
    long len;
    char str[];      /* flexible array member: no storage of its own */
};

int main(void) {
    struct pls *p = malloc(sizeof *p + 8);
    printf("str sits %td bytes past the header\n", (char *)p->str - (char *)p);
    free(p);
    return 0;
}
```

```output
str sits 8 bytes past the header
```

`str` is exactly 8 bytes past the header - the size of `len` - with no pointer stored anywhere. It is a symbolic name for "the bytes right after the header", which is why one `malloc(sizeof *p + n)` covers both.

## Don't bake refcounting into your string `[31:49 → 33:27]`

Salvatore's own production string library (Redis's [SDS](https://github.com/antirez/sds)) deliberately has **no** reference count in the string header. Refcounting belongs to the higher-level object that *owns* the string, not to the string itself - in Redis the `redisObject` wrapper carries the type, encoding, and refcount, while the SDS string underneath stays a plain length-prefixed buffer. Put the counter in the string and every wrapper grows a useless second one. SDS instead spends header bits on what is actually variable: length, allocated capacity, and a 3-bit type tag that picks between five header sizes (64, 32, 16, 8-bit, and a 5-bit variant for strings up to 31 chars, which fit in a single byte of overhead).

## Saturating the refcount `[35:31 → 37:13]`

If you *do* keep a refcount and you intern very common strings ("0", "1", "true", and friends), what happens when the count overflows `uint32_t`? The trick: pin the maximum as "sticky". Once the refcount reaches `UINT32_MAX`, neither increment nor decrement touches it again. That deliberately leaks the object - but you have already decided it is permanent, so the leak is the feature, not a bug.
