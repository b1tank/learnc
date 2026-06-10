---
id: 01-05-character-input-and-output
chapter: 1
label: "1.5"
title: Character Input and Output
prev: 01-04-symbolic-constants
next: ex-1-6
status: done
---

Text is just a stream of bytes. `getchar()` pulls the next byte from [standard input](https://en.wikipedia.org/wiki/Standard_streams); `putchar()` pushes one to standard output. Under both is the kernel's notion of a file descriptor (0 = stdin, 1 = stdout) and a userspace [stdio buffer](https://en.wikipedia.org/wiki/Data_buffer) so you aren't making one `read(2)`/`write(2)` syscall per character.

The runnable blocks below pipe their input via the **stdin** panel - that's the byte stream the program reads until end‑of‑file.

```c:run copy input to output
#include <stdio.h>

int main(void) {
    int c;
    while ((c = getchar()) != EOF)   /* read a byte; stop at end of input */
        putchar(c);                  /* echo it back */
    return 0;
}
```

```stdin
ground up
```

```output
ground up
```

## Why `int c`, not `char c`

This is the most important detail in the section. `getchar()` returns an `int`, not a `char`, so it can return every possible byte value (`0`–`255`) **plus** a distinct out-of-band sentinel, [`EOF`](https://en.wikipedia.org/wiki/End-of-file) (usually `-1`). If you store the result in a `char` first, you collapse that 257th value into the byte range and either lose `EOF` or mistake a legitimate byte `0xFF` for end of input. `EOF` is not a byte sitting in the stream - it's the signal the library returns when `read(2)` reports zero bytes left.

```c:run EOF is an int sentinel
#include <stdio.h>

int main(void) {
    printf("EOF = %d\n", EOF);           /* -1 on virtually every system */
    printf("sizeof(getchar()) = %zu\n", sizeof(getchar()));  /* 4: it's int */
    return 0;
}
```

```output
EOF = -1
sizeof(getchar()) = 4
```

## The assignment-inside-the-condition idiom

`while ((c = getchar()) != EOF)` packs three steps into one line: read, store, compare. The inner parentheses matter - `!=` binds tighter than `=`, so `c = getchar() != EOF` would assign the *boolean* result to `c`. This idiom is everywhere in C; learn to read it fluently.

## A state machine: counting lines, words, characters

K&R's famous word counter is a two-state machine (`IN` a word / `OUT` of one). It never stores the text - it processes the stream one byte at a time in **O(1) memory**, the model behind every real tokenizer and lexer (including the ones in a JS engine):

```c:run word count
#include <stdio.h>

#define IN  1   /* inside a word  */
#define OUT 0   /* between words  */

int main(void) {
    int c, nl = 0, nw = 0, nc = 0, state = OUT;
    while ((c = getchar()) != EOF) {
        ++nc;
        if (c == '\n') ++nl;
        if (c == ' ' || c == '\n' || c == '\t')
            state = OUT;
        else if (state == OUT) {
            state = IN;
            ++nw;             /* count each word once, on its first letter */
        }
    }
    printf("%d %d %d\n", nl, nw, nc);   /* lines words chars */
    return 0;
}
```

```stdin
the quick brown fox
jumps over
```

```output
2 6 31
```

The character count is 31 because both newlines are bytes too. This is exactly how the Unix `wc` command works.

## Go deeper
- [`getchar` / `putchar`](https://en.cppreference.com/w/c/io/getchar) - the byte-at-a-time stdio API
- [`read(2)`](https://man7.org/linux/man-pages/man2/read.2.html) - the syscall stdio buffers on top of
- [Finite-state machine](https://en.wikipedia.org/wiki/Finite-state_machine) - the model behind the word counter
- [ASCII](https://en.wikipedia.org/wiki/ASCII) - what those byte values mean as text
