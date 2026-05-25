---
id: 07-06-error-handling-stderr-and-exit
chapter: 7
label: "7.6"
title: 'Error Handling — Stderr and Exit'
prev: 07-05-file-access
next: 07-07-line-input-and-output
status: done
---

Programs need to report errors and quit. C provides two stream conventions and one function:

- **`stderr`** — the dedicated error stream. Unbuffered by default. Even when `stdout` is redirected to a file, `stderr` still goes to the terminal.
- **`exit(status)`** — terminate the program with the given status code. By convention, `0` = success, anything else = failure.

```c
#include <stdio.h>
#include <stdlib.h>

if (errno_condition) {
    fprintf(stderr, "%s: cannot open %s\n", argv[0], filename);
    exit(EXIT_FAILURE);     /* defined as 1 on most systems */
}
```

## Why a separate stream?

The shell pipe `prog1 | prog2` connects `prog1`'s **stdout** to `prog2`'s stdin. If `prog1` writes errors to stdout, they go *into the pipe* — `prog2` sees them as data, not as errors. Errors go to `stderr` so they appear on the terminal regardless of how stdout is wired.

```bash
$ ./mygrep pattern file > out.txt    # errors still show on terminal
$ ./mygrep pattern file 2> err.txt   # redirect ONLY errors
$ ./mygrep pattern file > out 2>&1   # merge stderr into stdout
```

## The `perror` helper

When a C library call fails, it sets the global `errno` to a numeric error code. `perror` prints a human-readable message:

```c
FILE *fp = fopen("missing.txt", "r");
if (!fp) {
    perror("missing.txt");
    /* prints e.g.: "missing.txt: No such file or directory" */
    exit(EXIT_FAILURE);
}
```

`perror(s)` prints `s: error_message\n` to `stderr`.

The modern alternative is `strerror(errno)`:

```c
fprintf(stderr, "fopen failed: %s\n", strerror(errno));
```

## `exit` vs. `return`

From `main`:

- `return 0;` and `exit(0);` are equivalent.
- `return 1;` and `exit(1);` are equivalent.

From any other function, `exit` quits the whole program; `return` only returns from that function.

`exit` does:

1. Run any functions registered with `atexit`.
2. Flush and close all open `FILE *` streams (including `stdout`).
3. Terminate the process with the given status.

There's also `_Exit` (no underscore prefix in plain C: `_Exit`) which skips the cleanup — useful in signal handlers and forked-child situations.

## Putting it together

```c:starter
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

static int cat_file(const char *name) {
    FILE *fp = fopen(name, "rb");
    if (!fp) {
        fprintf(stderr, "cat: %s: %s\n", name, strerror(errno));
        return 1;
    }
    char buf[4096];
    size_t n;
    while ((n = fread(buf, 1, sizeof buf, fp)) > 0)
        fwrite(buf, 1, n, stdout);
    if (ferror(fp)) {
        fprintf(stderr, "cat: read error on %s\n", name);
        fclose(fp);
        return 1;
    }
    fclose(fp);
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s FILE [FILE...]\n", argv[0]);
        return EXIT_FAILURE;
    }
    int rc = 0;
    for (int i = 1; i < argc; ++i)
        if (cat_file(argv[i]) != 0)
            rc = 1;
    return rc;
}
```

```output
(simple cat — needs CLI args)
```

## Exit status conventions

| Status | Meaning                                |
|--------|----------------------------------------|
| 0      | success                                |
| 1      | general error                          |
| 2      | shell builtin / misuse (often)         |
| 64–78  | sysexits.h codes (BSD heritage)         |
| 126    | command found but not executable       |
| 127    | command not found                      |
| 128+N  | terminated by signal N                  |

Shell scripts and other programs read `$?` to check. Always emit a meaningful status code; `return 0;` on every code path is a sign you forgot to think about errors.

## Try it

1. Modify `cat_file` so it prints filename + line number prefix for each input line (like `grep -n`).
2. Add a `--silent` flag that suppresses stderr output.
3. Run `./cat /etc/passwd /etc/missing 2> err.log > out.txt` and inspect both files.

## Notes from the author

- "Print error, exit with non-zero" is the most common pattern in CLI tools. Wrap it in a helper:
  ```c
  static void die(const char *msg) { perror(msg); exit(EXIT_FAILURE); }
  ```
  Used everywhere, you'll save thousands of lines.
- `errno` is thread-local in modern compilers — a good thing. Older code that assumed `errno` was a single global may behave wrongly in threaded contexts.
- Programs that need detailed error reporting often define their own status codes and a global "last error" struct. The Unix convention is "small integers"; richer error types are layered on top.

*Click **next →** for line I/O patterns.*
