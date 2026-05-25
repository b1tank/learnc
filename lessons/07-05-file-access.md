---
id: 07-05-file-access
chapter: 7
label: "7.5"
title: 'File Access'
prev: ex-7-5
next: 07-06-error-handling-stderr-and-exit
status: done
---

The standard streams (`stdin`, `stdout`, `stderr`) are convenient, but real programs read and write arbitrary files. The tool is the `FILE *` and the function pair `fopen`/`fclose`.

```c
FILE *fp = fopen("data.txt", "r");
if (!fp) {
    perror("fopen");
    return 1;
}
/* ... read or write through fp ... */
fclose(fp);
```

## Mode strings

| Mode  | Action                                                    |
|-------|-----------------------------------------------------------|
| `"r"` | open existing file for reading                             |
| `"w"` | create / truncate file for writing                          |
| `"a"` | open file for appending (creates if missing)               |
| `"r+"`| open for reading AND writing (must exist)                  |
| `"w+"`| create / truncate for reading AND writing                  |
| `"a+"`| open for read + append                                      |
| append `b` | binary mode (`"rb"`, `"wb+"`, etc.) — only matters on Windows |

Always check `fopen` for `NULL`. The most common failure modes:

- File doesn't exist (mode `"r"`).
- No permission.
- Path traversal you didn't expect (`"/etc/shadow"`).

## A file-copy program

```c:starter
#include <stdio.h>
#include <stdlib.h>

static int copy_file(const char *src, const char *dst) {
    FILE *in  = fopen(src, "rb");
    if (!in) { perror(src); return 1; }
    FILE *out = fopen(dst, "wb");
    if (!out) { perror(dst); fclose(in); return 1; }

    char buf[4096];
    size_t n;
    while ((n = fread(buf, 1, sizeof buf, in)) > 0) {
        if (fwrite(buf, 1, n, out) != n) {
            perror("fwrite");
            fclose(in); fclose(out);
            return 1;
        }
    }
    if (ferror(in)) { perror("fread"); fclose(in); fclose(out); return 1; }

    fclose(in);
    if (fclose(out) != 0) { perror("close out"); return 1; }
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc != 3) {
        fprintf(stderr, "usage: %s SRC DST\n", argv[0]);
        return 1;
    }
    return copy_file(argv[1], argv[2]);
}
```

```output
(awaits CLI args)
```

Run it: `./cp infile outfile`.

## `fread` / `fwrite` — binary I/O

```c
size_t fread(void *ptr, size_t size, size_t nmemb, FILE *fp);
size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *fp);
```

- `size` = bytes per element.
- `nmemb` = number of elements.
- Returns: actual number of *elements* read/written.

The two-argument design is for arrays of structures: `fread(arr, sizeof(struct foo), 100, fp)`. For raw byte I/O, set `size = 1` and `nmemb` to your buffer size.

## Other reads

| Function                            | Use                                  |
|-------------------------------------|--------------------------------------|
| `fgetc(fp)`                          | one byte (returns `int`, `EOF` on end) |
| `fgets(buf, n, fp)`                   | one line (up to `n-1` bytes, includes `\n`) |
| `fread(buf, sz, n, fp)`              | binary block                            |
| `fscanf(fp, "%d", &x)`               | parse like `scanf`                       |

| Function                            | Use                                  |
|-------------------------------------|--------------------------------------|
| `fputc(c, fp)`                       | one byte                                |
| `fputs(s, fp)`                        | a string (no trailing newline)          |
| `fwrite(buf, sz, n, fp)`             | binary block                            |
| `fprintf(fp, "%d\n", x)`             | format like `printf`                    |

## Always close

Forgetting `fclose` leaks the file descriptor AND may lose buffered data (`stdout`-style buffering). On exit, the runtime flushes and closes; but a long-running program that doesn't `fclose` will eventually exhaust descriptors (`Too many open files`).

`fclose` itself can fail — most commonly when its buffered data couldn't be written (disk full). Always check the return.

## Try it

1. Modify `copy_file` to also count bytes copied and print a summary.
2. Try copying a file to itself (`./cp x x`). What happens? Why?
3. Replace the buffer with `getline` + `fputs` and compare performance.

## Notes from the author

- The `FILE *` abstraction predates Unix's "everything is a file descriptor" model — it's a level above `read`/`write` system calls. The C runtime handles buffering; the OS handles the actual I/O.
- For very large files or streaming data, `fread`/`fwrite` in a fixed buffer is the fast path. Line-based `fgets` is great for text but slower for binary.
- `freopen` re-opens an existing stream with a different file or mode. `freopen("log.txt", "w", stdout)` makes all `printf` go to `log.txt` — useful for redirecting output without changing every call.

*Click **next →** for error handling.*
