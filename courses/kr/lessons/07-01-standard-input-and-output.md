---
id: 07-01-standard-input-and-output
chapter: 7
label: "7.1"
title: 'Standard Input and Output'
prev: 06-09-bit-fields
next: ex-7-1
status: done
---

Every C program starts with three streams already open: **standard input** (`stdin`), **standard output** (`stdout`), and **standard error** (`stderr`). A *stream* is the standard library's portable wrapper over a raw OS file - it adds buffering and formatting on top of the kernel's file descriptors 0, 1, and 2. `getchar()` reads one character from `stdin`; `putchar(c)` writes one to `stdout`. Because these are streams and not the keyboard/screen directly, the **shell can redirect** them: `./prog < in.txt > out.txt` swaps the files underneath without the program knowing or caring. That decoupling is the heart of the Unix philosophy.

## Reading and writing a character at a time

```c:run uppercase every character from stdin
#include <stdio.h>

int main(void) {
    int c, n = 0;                       /* int, NOT char - must hold EOF */
    while ((c = getchar()) != EOF) {    /* read until end of input */
        if (c >= 'a' && c <= 'z')
            c = c - 'a' + 'A';          /* shift lowercase to uppercase */
        putchar(c);
        n++;
    }
    printf("[%d chars]\n", n);
    return 0;
}
```

```stdin
hello, world
```

```output
HELLO, WORLD
[13 chars]
```

The single most important detail here is `int c`, not `char c`. `getchar` returns an `int` so it can return every possible byte value (0–255) **plus** a distinct out-of-band value `EOF` (typically -1) signalling end of input. If you stored the result in a `char`, you couldn't tell the real byte `0xFF` apart from `EOF`, and the loop could either stop early or never stop. `EOF` isn't a character that lives in the data - it's a sentinel the library returns when the stream is exhausted (the kernel's `read` returned 0 bytes). The 13 characters counted include the trailing newline.

## Buffering, EOF, and redirection

These calls feel like they touch the terminal one character at a time, but they don't: the C library **buffers** them. `stdout` to a terminal is usually *line-buffered* (flushed on each `\n`), and to a file or pipe it's *fully buffered* (flushed in big blocks), so the expensive [`write` system call](https://man7.org/linux/man-pages/man2/write.2.html) happens once per block instead of once per character. `getchar` is really a macro/inline that pulls from an in-memory buffer the library refilled with one big `read`. You can force a flush with [`fflush(stdout)`](https://en.cppreference.com/w/c/io/fflush), and the buffer is flushed automatically when it fills, on `\n` for line-buffered streams, and at normal program exit. Where does `EOF` come from? At a terminal you type **Ctrl-D** (Unix) to signal it; under redirection it's reached when the file's bytes run out. And because `stdin`/`stdout` are just streams over file descriptors, `prog < file` makes `getchar` read the file and `prog | other` makes `putchar` feed another program's input - all without changing a line of code. (This page's runner provides the *Input* box above as `stdin`.)

## Go deeper
- [`<stdio.h>` streams](https://en.cppreference.com/w/c/io) - the buffered I/O library
- [`getchar` / `putchar`](https://en.cppreference.com/w/c/io/getchar) - one character at a time
- [Standard streams](https://en.wikipedia.org/wiki/Standard_streams) - stdin/stdout/stderr and fds 0/1/2
- [`read(2)`](https://man7.org/linux/man-pages/man2/read.2.html) - the syscall under the buffer
