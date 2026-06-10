---
id: 07-05-file-access
chapter: 7
label: "7.5"
title: 'File Access'
prev: ex-7-5
next: 07-06-error-handling-stderr-and-exit
status: done
---

So far our programs only touched `stdin` and `stdout`. To work with *named files* you open your own streams. `fopen(name, mode)` asks the operating system to open a file and hands back a `FILE *` - an opaque pointer to the library's bookkeeping for that stream (its buffer, current position, and the underlying file descriptor). Every later call (`fgetc`, `fputc`, `fprintf`, `fscanf`, `fgets`) takes that `FILE *` as its first or last argument. When done you `fclose` it, which flushes the buffer and releases the descriptor. The three standard streams are simply pre-opened `FILE *`s - and that means the `stdin` your shell handed you behaves exactly like a file you opened yourself.

## A stream is a stream - copying stdin to stdout

```c:run treat stdin/stdout as the FILE* streams they are
#include <stdio.h>

int main(void) {
    int c, lines = 0;
    while ((c = getc(stdin)) != EOF) {  /* getc works on any FILE*  */
        putc(c, stdout);                /* ...so does putc          */
        if (c == '\n') lines++;
    }
    fprintf(stdout, "[copied %d lines]\n", lines);   /* fprintf to a stream */
    return 0;
}
```

```stdin
alpha
beta
```

```output
alpha
beta
[copied 2 lines]
```

`getc(stdin)` and `putc(c, stdout)` are the general forms of `getchar()`/`putchar()` - the latter are just shorthands fixed to the standard streams. `fprintf(stdout, …)` is `printf` aimed at an explicit stream. The point of this example is that **nothing about the code changes** when the stream is a file you opened versus a standard stream: the same functions operate on any `FILE *`. (Real file I/O with `fopen` needs a filesystem, which this in-browser WASM sandbox doesn't provide, so we demonstrate with `stdin` - itself a perfectly good stream.)

## The fopen/fclose lifecycle and what's underneath

With a real filesystem the pattern is always the same shape:

```c
FILE *fp = fopen("data.txt", "r");      /* "r" read, "w" write, "a" append, + "b" binary */
if (fp == NULL) { perror("data.txt"); return 1; }   /* ALWAYS check for NULL */
int c;
while ((c = getc(fp)) != EOF) putc(c, stdout);
fclose(fp);                              /* flush buffer, release the fd */
```

The mode string is essential: `"r"` reads an existing file, `"w"` creates/**truncates** for writing (it destroys existing contents!), `"a"` appends, and a `+` adds the other direction; append a `b` for binary on systems that distinguish text mode. `fopen` returns `NULL` on failure - file missing, no permission, too many open files - and you must check it, because using a `NULL` `FILE *` crashes. Underneath, `fopen` performs the [`open(2)`](https://man7.org/linux/man-pages/man2/open.2.html) system call to get a small integer **file descriptor** from the kernel, then wraps it in a buffered `FILE`. That buffering is why `fclose` (or `fflush`) matters: written bytes may sit in the library's buffer and only reach the disk when the buffer fills, you flush, or you close - forget to close and you can lose the tail of your output. Descriptors are a finite resource, so every `fopen` should be paired with an `fclose`. This `FILE *` layer is the *portable, buffered* face of the kernel's raw, unbuffered [file-descriptor I/O](08-01-file-descriptors.md) you'll meet in the next chapter.

## Go deeper
- [`fopen` / `fclose`](https://en.cppreference.com/w/c/io/fopen) - opening and closing streams
- [`fopen(3)`](https://man7.org/linux/man-pages/man3/fopen.3.html) - modes and semantics
- [File descriptor](https://en.wikipedia.org/wiki/File_descriptor) - the kernel handle under a `FILE *`
- [`open(2)`](https://man7.org/linux/man-pages/man2/open.2.html) - the syscall `fopen` calls
