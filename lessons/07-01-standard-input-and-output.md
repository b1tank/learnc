---
id: 07-01-standard-input-and-output
chapter: 7
label: "7.1"
title: 'Standard Input and Output'
prev: ex-6-6
next: 07-02-formatted-output-printf
status: done
---

Chapter 7 covers the **standard I/O library** — the part of C that gives you buffered files, formatted output, and the `stdin`/`stdout`/`stderr` streams.

The simplest I/O primitives:

```c
int  getchar(void);          /* read one char from stdin; EOF at end */
int  putchar(int c);          /* write one char to stdout; returns the char */
int  printf(const char *fmt, ...);
int  scanf(const char *fmt, ...);
```

These all live in `<stdio.h>`. They're buffered: `putchar('x')` doesn't necessarily write to the terminal immediately — it goes into a buffer that's flushed on newlines (if line-buffered) or when full (if fully buffered).

## A character filter

```c:starter
#include <stdio.h>
#include <ctype.h>

int main(void) {
    int c;
    while ((c = getchar()) != EOF) {
        putchar(toupper(c));
    }
    return 0;
}
```

```output
(awaits input — uppercases every character)
```

Try typing `hello world` and pressing Ctrl-D (EOF) on Unix; you'll see `HELLO WORLD`.

## What is `EOF`?

`EOF` is a macro defined in `<stdio.h>`, almost always `-1`. The crucial detail: `getchar` returns `int`, not `char`. A `char` couldn't represent `EOF` and `255` distinctly (especially on platforms where `char` is signed and `EOF == -1`). Always:

```c
int c = getchar();       /* int, not char! */
if (c == EOF) ...
```

## `stdin`, `stdout`, `stderr`

These are three **streams** that exist by default:

| Name     | Default destination       | When buffered                  |
|----------|---------------------------|--------------------------------|
| `stdin`  | keyboard / pipe input     | line-buffered (terminal)        |
| `stdout` | terminal                  | line-buffered (terminal); full (pipe) |
| `stderr` | terminal                  | **unbuffered** — writes immediately |

`stderr` is unbuffered so error messages appear right away — they're not lost if the program crashes before the buffer flushes.

## Shell redirection

The OS lets you redirect streams without the program knowing:

```bash
./prog < input.txt          # stdin reads from input.txt
./prog > output.txt         # stdout writes to output.txt
./prog 2> errors.txt        # stderr writes to errors.txt
./prog < in > out 2> err    # all three at once
```

This is one of Unix's enduring design wins: programs read/write the standard streams; the shell wires them up to files, pipes, or other programs.

## Try it

1. Modify the program to also count characters and print the count at the end.
2. Add a check for whitespace — print only non-whitespace characters.
3. Run with `./prog < /etc/hostname` to see file redirection.

## Notes from the author

- The standard streams are pre-opened by the C runtime before `main` runs. You don't need to "open" them — they're ready.
- Buffering matters for interactive programs. If `stdout` is fully-buffered (e.g. when piped), `printf("Loading...")` might not appear until much later. Call `fflush(stdout)` or end with `\n` to force a flush.
- For real interactive prompts, also consider `setvbuf(stdout, NULL, _IONBF, 0)` to disable buffering entirely — fast feedback at the cost of more I/O system calls.

*Click **next →** for `printf`.*
