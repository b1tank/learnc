---
id: 07-07-line-input-and-output
chapter: 7
label: "7.7"
title: 'Line Input and Output'
prev: 07-06-error-handling-stderr-and-exit
next: 07-08-miscellaneous-functions
status: done
---

Text processing usually means "one line at a time". The library gives you two primitives:

```c
char *fgets(char *buf, int n, FILE *fp);   /* read one line */
int   fputs(const char *s, FILE *fp);       /* write a string */
```

## `fgets` semantics

```c
char buf[1024];
while (fgets(buf, sizeof buf, stdin) != NULL) {
    /* `buf` contains the line, including the trailing '\n' if it fit */
    /* on EOF or error, returns NULL */
}
```

Important details:

- Reads up to `n-1` characters OR until `\n` OR until EOF — whichever comes first.
- Always null-terminates.
- **Keeps the `\n`** if it fit in the buffer.
- Returns `NULL` on EOF *with no characters read*, or on error.

If the line was longer than `n-1`, you get the first chunk and need to call `fgets` again for the rest. The lack of a trailing `\n` in `buf` tells you the line was truncated.

## Trimming the newline

A common idiom:

```c
size_t len = strlen(buf);
if (len > 0 && buf[len-1] == '\n')
    buf[--len] = '\0';
```

Or, for newline + trailing `\r` (Windows files):

```c
while (len > 0 && (buf[len-1] == '\n' || buf[len-1] == '\r'))
    buf[--len] = '\0';
```

## A line-numbering filter

```c:starter
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[4096];
    int  n = 0;
    while (fgets(buf, sizeof buf, stdin)) {
        ++n;
        size_t L = strlen(buf);
        int had_newline = (L > 0 && buf[L-1] == '\n');
        if (had_newline) buf[L-1] = '\0';
        printf("%4d  %s\n", n, buf);
    }
    return 0;
}
```

```output
(awaits stdin — try seq 1 5 | ./nl)
```

Pipe `seq 1 5` into it:

```output
   1  1
   2  2
   3  3
   4  4
   5  5
```

## `fputs` semantics

```c
fputs("hello\n", stdout);
```

Writes the string (without the terminating null) to the stream. **No automatic newline** — you write your own. The companion `puts(s)` adds a newline (it's `stdout`-only).

## `getline` — the modern (POSIX) choice

```c
char  *line = NULL;
size_t cap  = 0;
ssize_t n;
while ((n = getline(&line, &cap, stdin)) != -1) {
    /* line: malloc'd buffer (grows as needed). cap: capacity. n: length. */
    fputs(line, stdout);
}
free(line);
```

`getline`:

- Allocates the buffer for you (passing `&line`).
- Grows the buffer if the line is longer.
- Returns the length (which can be `0` to indicate EOF or `>0` for real lines).
- Always reads a full line — no truncation.

It's the right choice for new code. K&R 2e predates it, so the book uses `fgets`; both are fine.

## When to use which

| Tool                  | Best for                                |
|-----------------------|-----------------------------------------|
| `fgets`               | Fixed-size buffer, lines bounded       |
| `getline` (POSIX)     | Arbitrary-length lines, modern code    |
| `fread`               | Binary blocks, fixed-size records      |
| Build your own         | Tight loops, custom delimiters         |

## Try it

1. Add a `-b` flag that numbers only non-blank lines (like `nl -b a` vs `nl -b t`).
2. Switch to `getline` and verify it handles lines longer than 4096 bytes.
3. Detect Windows line endings (`\r\n`) and normalise to `\n`.

## Notes from the author

- `gets` (no `f`) is the **most dangerous function in the C standard**. It reads a line into a buffer with no length limit — guaranteed buffer overflow if input is long enough. **Removed from C11.** Never use it.
- "Read a line" is one of the most-needed primitives, and C's three options (`gets`, `fgets`, `getline`) span the entire safety spectrum. Pick `getline` for new code; `fgets` for portable code; never `gets`.
- For very fast bulk text processing, `mmap` the file and walk it as a `const char *`. No buffering, no system calls per line. Useful for log analysis at the gigabyte-per-second scale.

*Click **next →** for miscellaneous helpers.*
