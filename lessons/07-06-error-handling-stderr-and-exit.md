---
id: 07-06-error-handling-stderr-and-exit
chapter: 7
label: "7.6"
title: 'Error Handling — Stderr and Exit'
prev: 07-05-file-access
next: 07-07-line-input-and-output
status: done
---

When something goes wrong, a program needs to tell *someone* and stop cleanly. C splits this into two channels. **`stderr`** is a second output stream, separate from `stdout`, dedicated to diagnostics — it exists so that error messages still reach the user even when `stdout` is redirected into a file or pipe (`prog > out.txt` sends results to the file but errors to the screen). And the program's **exit status** — the small integer returned from `main` or passed to `exit()` — tells the *parent process* (usually the shell) whether the run succeeded: `0` means success, non-zero means failure, by universal Unix convention.

## Reporting an error and signalling failure

```c:run validate input, compute, and exit with a status
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        fprintf(stderr, "error: expected an integer\n");   /* diagnostics -> stderr */
        exit(1);                                           /* fail */
    }
    if (n < 0) {
        fprintf(stderr, "error: %d is negative\n", n);
        return 1;
    }
    long fact = 1;
    for (int i = 2; i <= n; i++) fact *= i;
    printf("%d! = %ld\n", n, fact);                        /* results -> stdout */
    return 0;                                              /* success */
}
```

```stdin
5
```

```output
5! = 120
```

Notice the deliberate split: the *result* `5! = 120` goes to `stdout` via `printf`, while *error messages* would go to `stderr` via `fprintf(stderr, …)`. With the valid input `5` no error fires, so you see only the result. Had the input been `abc`, `scanf` would return 0, the program would write `error: expected an integer` to stderr and `exit(1)`. The exit code is invisible in the output but very real: the shell exposes it as `$?`, and `make`, CI pipelines, and shell `&&`/`||` chains all branch on it.

## Why two streams, and how to exit cleanly

The separation of `stdout` and `stderr` is what makes Unix pipelines robust: in `grep foo data | sort`, the *data* flows through the pipe while any error messages bypass it and land on your terminal, so they neither corrupt the piped data nor vanish silently. `stderr` is also typically **unbuffered** (or line-buffered), so error text appears immediately rather than getting stuck in a buffer that's lost if the program then crashes. For exiting, you have three tools. Returning from `main` is the normal path. [`exit(status)`](https://en.cppreference.com/w/c/program/exit) ends the program *from anywhere*, and it runs cleanup — flushing all stream buffers and invoking functions registered with `atexit` — so buffered output isn't lost; the standard names `EXIT_SUCCESS` (0) and `EXIT_FAILURE` (non-zero) for portability. Its blunt sibling [`_exit`/`abort`](https://man7.org/linux/man-pages/man3/abort.3.html) terminates *without* flushing. A convenient helper is [`perror("context")`](https://en.cppreference.com/w/c/io/perror), which prints your message plus a human-readable description of the global `errno` set by the last failed library/system call (e.g. `data.txt: No such file or directory`) — far friendlier than a bare error code. The discipline to internalize: **results to stdout, errors to stderr, and a meaningful non-zero exit status on failure** so the programs and people downstream of you can react.

## Go deeper
- [Standard streams](https://en.wikipedia.org/wiki/Standard_streams) — why stderr is separate from stdout
- [`exit` / `EXIT_FAILURE`](https://en.cppreference.com/w/c/program/exit) — clean termination and cleanup
- [`perror` / `errno`](https://en.cppreference.com/w/c/io/perror) — turning error codes into messages
- [Exit status](https://en.wikipedia.org/wiki/Exit_status) — the convention the shell relies on
