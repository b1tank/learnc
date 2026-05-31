---
id: 08-05-example-fopen-and-getc
chapter: 8
label: "8.5"
title: 'Example — Fopen and Getc'
prev: 08-04-random-access-lseek
next: ex-8-2
status: done
---

The whole point of the standard library's buffered streams is to sit *between* you and the raw `read`/`write` syscalls, so you can call `getc` a million times while the library makes only a handful of expensive kernel trips. This lesson builds a **miniature version of that machinery** — a `getc` that owns a small buffer, refills it with one `read` when empty, and then hands out bytes one at a time. Seeing this implemented demystifies `<stdio.h>`: `FILE` is essentially "a descriptor + a buffer + a position into the buffer," and `getc` is "return the next buffered byte, refilling via `read` when needed."

## Implementing getc over a syscall

```c:run a hand-rolled buffered getc
#include <unistd.h>
#include <stdio.h>

static char buf[8];           /* the stream's private buffer  */
static int  n_in = 0;         /* bytes currently in the buffer */
static int  pos  = 0;         /* next byte to hand out         */

int mygetc(void) {
    if (pos >= n_in) {                    /* buffer drained? refill it */
        n_in = read(0, buf, sizeof buf);  /* ONE syscall per 8 bytes   */
        pos  = 0;
        if (n_in <= 0) return -1;         /* 0 => EOF, <0 => error      */
    }
    return (unsigned char) buf[pos++];    /* serve next byte, advance   */
}

int main(void) {
    int c, vowels = 0;
    while ((c = mygetc()) != -1) {
        putchar(c);
        if (c=='a'||c=='e'||c=='i'||c=='o'||c=='u') vowels++;
    }
    printf("[%d vowels]\n", vowels);
    return 0;
}
```

```stdin
education
```

```output
education
[5 vowels]
```

Trace the buffering: `mygetc` checks whether the buffer still has unserved bytes (`pos < n_in`). If not, it issues *one* `read` of up to 8 bytes and resets `pos`. Every subsequent call just returns `buf[pos++]` with no syscall at all — so reading the 9-character input "education\n" costs only two `read` calls (8 bytes, then the rest) instead of ten. The cast to `unsigned char` before returning matters: it guarantees a byte value in 0–255 that never collides with the `-1` EOF sentinel, the same reason real `getc` returns `int`. This is, in miniature, exactly how the library's `getc` works.

## What real fopen/FILE add on top

A production `FILE` is this idea plus a lot of robustness. `fopen` calls [`open`](08-03-open-creat-close-unlink.md) to get the descriptor, then `malloc`s a buffer (typically `BUFSIZ`, often 4–8 KB, sized near the filesystem block size) and wraps both in a `FILE` struct that also records the mode, an error flag, an EOF flag, and — for writable streams — a *write* buffer flushed by the symmetric mechanism (`putc` fills it; a full buffer, a newline on line-buffered streams, `fflush`, or `fclose` drains it with one `write`). Real implementations also handle pushback ([`ungetc`](https://en.cppreference.com/w/c/io/ungetc)), the three buffering modes (unbuffered, line-buffered, fully-buffered — set via [`setvbuf`](https://en.cppreference.com/w/c/io/setvbuf)), thread-safety locking, and the buffer/offset reconciliation that makes `fseek` correct. But the core insight is the one you just coded: **buffering trades a little memory for a massive reduction in system calls**, and that trade is why `getchar`-style code can be both convenient *and* fast. Understanding this layer means you know when to bypass it — high-throughput code that already moves data in large blocks may call `read`/`write` directly to skip the copy through stdio's buffer entirely.

## Go deeper
- [`getc` / `getchar`](https://en.cppreference.com/w/c/io/getchar) — the real buffered readers
- [`setvbuf`](https://en.cppreference.com/w/c/io/setvbuf) — choosing the buffering mode and size
- [Data buffer](https://en.wikipedia.org/wiki/Data_buffer) — the space-for-syscalls trade
- [`fopen(3)`](https://man7.org/linux/man-pages/man3/fopen.3.html) — what a real FILE wraps
