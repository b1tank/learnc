---
id: 05-10-command-line-arguments
chapter: 5
label: "5.10"
title: Command-line Arguments
prev: 05-09-pointers-vs-multi-dimensional-arrays
next: 05-11-pointers-to-functions
status: done
---

`main` can be declared in two equivalent forms:

```c
int main(int argc, char *argv[])   { ... }
int main(int argc, char **argv)    { ... }
```

When the program starts, the runtime passes:

- **`argc`** — argument count, ≥ 1.
- **`argv`** — array of pointers to argument strings.
  - `argv[0]` is conventionally the program name (the executable's path, varies by OS).
  - `argv[1]` ... `argv[argc-1]` are the remaining arguments, in order.
  - `argv[argc]` is `NULL` (you can rely on this terminator).

## A simple echo

```c:starter
#include <stdio.h>

int main(int argc, char *argv[]) {
    /* print every argument except the program name */
    for (int i = 1; i < argc; ++i) {
        printf("%s", argv[i]);
        if (i + 1 < argc) putchar(' ');
    }
    putchar('\n');
    return 0;
}
```

Compile and run:

```bash
$ gcc echo.c -o echo
$ ./echo hello world from C
hello world from C
$ ./echo
```

`argc == 1` on the bare run (just the program name), and the body prints nothing.

The output above will vary based on what arguments you pass at runtime; the Try-it block in your browser obviously has no shell, so the binding here is illustrative.

## Equivalent forms via pointers

Because `argv` is "pointer to (pointer to char)", you can walk it without indexing:

```c
int main(int argc, char **argv) {
    while (*++argv != NULL)        /* skip argv[0], walk to the NULL */
        printf("%s ", *argv);
    putchar('\n');
    return 0;
}
```

`++argv` advances the pointer past the next element; `*argv` then yields the current string. The walk ends at the NULL terminator. (No `argc` needed.)

## A real example: a tiny `grep`-style filter

```c
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "usage: %s pattern\n", argv[0]);
        return 1;
    }
    const char *pattern = argv[1];
    char line[1024];
    while (fgets(line, sizeof line, stdin)) {
        if (strstr(line, pattern))
            fputs(line, stdout);
    }
    return 0;
}
```

Usage: `./grep hello < file.txt` prints every line containing "hello".

## Options parsing: by hand or `getopt`

A few options can be handled with hand-rolled `if`/`else` over `argv[i]`. For more than two or three, use `getopt` from `<unistd.h>` (POSIX) or `argparse`/`gflags`-style libraries.

A minimal hand-rolled pattern:

```c
int verbose = 0;
const char *file = NULL;
for (int i = 1; i < argc; ++i) {
    if      (strcmp(argv[i], "-v") == 0)       verbose = 1;
    else if (strcmp(argv[i], "--") == 0)       /* end of options */ ;
    else if (argv[i][0] == '-')                {
        fprintf(stderr, "unknown option: %s\n", argv[i]);
        return 1;
    }
    else                                       file = argv[i];
}
```

This handles `-v` and a positional file name. For `--name=value`, short clustering (`-vlt`), and similar conveniences, `getopt_long` is the standard.

## Modern note

- The exit code from `main` (returned or via `exit`) is what the shell sees in `$?`. Convention: 0 success, non-zero failure. Don't return values > 255 (the shell only sees the low byte).
- `argv[0]` may be a relative path, an absolute path, or even just the basename — it depends on how the OS started the process. Don't trust it for "find my own executable on disk"; use `/proc/self/exe` on Linux or `_NSGetExecutablePath` on macOS.
- Arguments are bytes, not characters. On Linux/macOS, locale-aware programs decode them as UTF-8 by default. On Windows, the `wmain` variant takes wide-char arguments natively.

## Try it

1. Write a program that sums all its numeric command-line arguments using `atof` (or `strtod` for error checking). `./sum 1.5 2 3.5` → `7`.
2. Write a `reverse` program that prints its arguments in reverse order, separated by spaces.
3. Read your own program name out of `argv[0]` and print "Hello, I am ..." — observe how the path varies depending on how you ran it (`./prog` vs `./bin/prog` vs `prog` from `PATH`).

## Notes from the author

- The "args + NULL terminator" convention extends to environment variables: `extern char **environ;` is a `NULL`-terminated array of `KEY=VALUE` strings.
- Parsing command-line arguments by hand teaches you the data structure but quickly becomes painful. `getopt` handles ~80% of cases cleanly; for the remaining 20%, modern alternatives like `argparse-c` or `popt` or just writing the loop are reasonable.
- Many "small Unix tools" become *very* small once you stop reinventing argument parsing. The shell, file I/O, and the `argv` walker are what make C programs feel like Unix programs.

*Click **next →** for function pointers — C's mechanism for callbacks.*
