---
id: 05-10-command-line-arguments
chapter: 5
label: "5.10"
title: Command-line Arguments
prev: 05-09-pointers-vs-multi-dimensional-arrays
next: ex-5-10
status: done
---

When you run a program from a shell, the words you type after the program name are handed to it as **command-line arguments**. C delivers them through `main`'s two optional parameters: `int main(int argc, char *argv[])`. `argc` ("argument count") is how many words there were, including the program's own name; `argv` ("argument vector") is an array of `char *` - pointers to those words as strings. This is the pointer-array pattern from earlier sections in its most important real-world role: it's how the operating system passes you input before your program even starts.

## Reading argc and argv

The runnable below can't receive real shell arguments (it runs in your browser), so it builds an `argv` *by hand* to show the exact shape the OS would hand you - then processes it like the classic `echo` command:

```c:run the shape of argc/argv (echo)
#include <stdio.h>

/* echo: print every argument after the program name, space-separated */
int run_echo(int argc, char *argv[]) {
    for (int i = 1; i < argc; i++)        /* start at 1: skip argv[0] */
        printf("%s%s", argv[i], i < argc - 1 ? " " : "");
    printf("\n");
    return 0;
}

int main(void) {
    /* A real shell builds this for you from: echo hello from argv */
    char *fake[] = {"echo", "hello", "from", "argv"};
    int n = sizeof fake / sizeof fake[0];
    printf("argc = %d, argv[0] = %s\n", n, fake[0]);
    run_echo(n, fake);
    return 0;
}
```

```output
argc = 4, argv[0] = echo
hello from argv
```

The convention is fixed: `argv[0]` is the program name (here "echo"), and the *actual* arguments start at `argv[1]`, which is why argument-processing loops begin at `i = 1`. `argc` always counts `argv[0]` too, so `argc - 1` is the number of real arguments. The standard also guarantees `argv[argc]` is a `NULL` pointer, so you can alternatively walk the vector with `while (*argv) { ... argv++; }` until you hit the terminator instead of using a counter.

## What really happens before `main`

These strings don't appear by magic. When the shell runs your program, it makes an [`execve`](https://man7.org/linux/man-pages/man2/execve.2.html) system call, passing the argument list to the kernel. The kernel copies those strings onto the new process's stack and arranges for the C runtime startup code (`crt0`) to pick them up and call your `main(argc, argv)`. So `argv` literally points into your own stack memory, set up by the kernel before your first line runs. This is the program's primary input channel for *configuration* (filenames, flags, options), distinct from `stdin` which carries the *data stream*. Real tools parse `argv` for flags like `-v` or `--output=file`; for anything beyond a couple of arguments, libraries such as [`getopt`](https://man7.org/linux/man-pages/man3/getopt.3.html) handle the parsing. The same mechanism delivers the *environment* too, via an optional third `main` parameter `char *envp[]`.

## Go deeper
- [`main` and its arguments (C)](https://en.cppreference.com/w/c/language/main_function) - `argc`/`argv` contract
- [`execve(2)`](https://man7.org/linux/man-pages/man2/execve.2.html) - how the kernel passes arguments
- [Program startup / `crt0`](https://en.wikipedia.org/wiki/Crt0) - what runs before `main`
- [`getopt(3)`](https://man7.org/linux/man-pages/man3/getopt.3.html) - parsing options the standard way
