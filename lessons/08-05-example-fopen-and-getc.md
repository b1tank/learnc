---
id: 08-05-example-fopen-and-getc
chapter: 8
label: "8.5"
title: 'Example — Fopen and Getc'
prev: 08-04-random-access-lseek
next: 08-06-example-listing-directories
status: done
---

How does stdio actually work? Let's reimplement a tiny `fopen` and `getc` on top of the `open`/`read` system calls.

The pattern: maintain a struct with a fd, a buffer, a pointer into the buffer, and a remaining count. `getc` returns the next byte from the buffer; when the buffer is empty, refill it with one `read` call.

```c:starter
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>

#define BUFSIZE 1024

typedef struct {
    int   fd;
    char  buf[BUFSIZE];
    int   pos;          /* next byte to return */
    int   end;          /* one past the last buffered byte */
    int   eof;
    int   err;
} my_FILE;

static my_FILE *my_fopen(const char *path, const char *mode) {
    int flags;
    if      (mode[0] == 'r') flags = O_RDONLY;
    else if (mode[0] == 'w') flags = O_WRONLY | O_CREAT | O_TRUNC;
    else if (mode[0] == 'a') flags = O_WRONLY | O_CREAT | O_APPEND;
    else return NULL;

    int fd = open(path, flags, 0644);
    if (fd < 0) return NULL;

    my_FILE *fp = calloc(1, sizeof *fp);
    if (!fp) { close(fd); return NULL; }
    fp->fd = fd;
    return fp;
}

static int my_getc(my_FILE *fp) {
    if (fp->pos >= fp->end) {
        if (fp->eof) return EOF;
        ssize_t n = read(fp->fd, fp->buf, BUFSIZE);
        if (n <= 0) {
            if (n < 0) fp->err = 1;
            fp->eof = 1;
            return EOF;
        }
        fp->pos = 0;
        fp->end = (int)n;
    }
    return (unsigned char)fp->buf[fp->pos++];
}

static int my_fclose(my_FILE *fp) {
    if (!fp) return 0;
    int rc = close(fp->fd);
    free(fp);
    return rc;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s FILE\n", argv[0]);
        return 1;
    }
    my_FILE *fp = my_fopen(argv[1], "r");
    if (!fp) { perror(argv[1]); return 1; }

    int c, n = 0;
    while ((c = my_getc(fp)) != EOF) { putchar(c); ++n; }
    fprintf(stderr, "\n--- read %d bytes ---\n", n);
    my_fclose(fp);
    return 0;
}
```

```output
(awaits CLI args)
```

## The buffering win

Without the buffer:

```c
char ch;
while (read(fd, &ch, 1) == 1) /* one syscall per byte */
    putchar(ch);
```

Every `getc` call would do a system call. Buffering means one syscall per 1024 bytes — three orders of magnitude fewer.

This is exactly how real `<stdio.h>` is implemented. `FILE` is a struct of fd + buffer + position + flags. `fgetc` is "return next buffered byte; refill if empty". `fputc` is "append to buffer; flush if full".

## Variants of buffering

stdio supports three buffering modes (set with `setvbuf`):

| Mode      | When buffer flushes               | Default for     |
|-----------|----------------------------------|-----------------|
| `_IOFBF`  | when full                         | files            |
| `_IOLBF`  | on newline or when full           | terminals        |
| `_IONBF`  | never (every write goes through) | stderr            |

The full-buffer default for files explains why a long-running pipe `prog1 | prog2` may not show `prog1`'s output until `prog1` exits: stdout is fully buffered to the pipe.

## The TODO list of features we skipped

A real `FILE *` also has:

- `ungetc` — one-character pushback.
- Bidirectional buffering for `r+` mode.
- Wide-character (`wchar_t`) support.
- Locale-aware reads.
- Thread-safety via internal locks.
- `fileno()` to recover the underlying fd.

The ~80-line stub above captures the *core idea* — buffered reads on top of `read` — and that's the most important thing to learn.

## Try it

1. Add an `my_ungetc` that pushes back one character.
2. Add a `my_fread(buf, sz, n, fp)` that batches buffered bytes for binary I/O.
3. Compare timings: byte-at-a-time `read` vs buffered `my_getc`. Expect ~100x speedup.

## Notes from the author

- glibc's `FILE` is ~120 fields. Most of it is layered: thread lock, lock owner, wide-char state, transformation state, etc. The kernel of it is still "buffer + position + fd".
- Reimplementing stdio is a rite of passage — you understand it forever after.
- Buffering hides the kernel boundary. Knowing where the buffer lives helps you reason about `fflush`, `setvbuf`, and the surprises that come from mixing stdio with raw `read`/`write` on the same fd.

*Click **next →** for directory listing.*
