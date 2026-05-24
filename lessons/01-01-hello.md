---
id: 01-01-hello
chapter: 1
label: "1.1"
title: Getting Started
prev: null
next: 01-02-temp
status: done
---

The first program in K&R is a single line of output. It looks trivial, but it touches every piece of the C build pipeline: header inclusion, function definition, calling a library function, the return value of `main`. Get this one running and you have a working compiler, a working terminal, and the world's smallest C program. That is the whole point of section 1.1 — *prove the tools work*.

```c:starter
#include <stdio.h>

int main(void) {
    printf("hello, world\n");
    return 0;
}
```

```output
hello, world
```

Press **run**. You should see `hello, world` appear in the terminal below.

## What's going on

- `#include <stdio.h>` pulls in the **standard I/O** header. It tells the compiler that names like `printf` and `getchar` exist and what shape they have. Without it, the compiler doesn't know that `printf` is a function.
- `int main(void)` declares the program's entry point. When the operating system starts your program, it calls `main` for you. `main` returns an `int` — `0` means success, anything else means failure.
- `printf` writes formatted text to **standard output** (your terminal — in this case the black pane below the editor). The `\n` is an *escape sequence* meaning "newline." Without it, the output would not advance to a new line at the end and a typical shell prompt would jam right up against the message.
- **`printf` never adds a newline for you.** Every line break is one you typed explicitly with `\n`. Two `printf` calls in a row, neither containing `\n`, produce one line of output joined back-to-back. Other escapes in the same family: `\t` (tab), `\b` (backspace), `\"` (literal double quote inside a string), `\\` (a literal backslash).
- `return 0;` hands control back to the OS with an exit status of zero, the C convention for "everything fine."

## Modern note

K&R writes `main()` with an empty parameter list. In old C that meant "an unspecified number of arguments" — sloppy by today's standards. Modern C prefers `int main(void)` (explicitly no arguments) or `int main(int argc, char *argv[])` (with command-line arguments). The bare `main()` form is technically still legal but most modern compilers will warn about it.

You can also omit the `return 0;` at the end of `main` in C99 and later — the compiler will insert one for you. K&R wrote in pre-ANSI C; both styles you see in the book may need small modernizations.

## Try it

1. Change the message to your own name. Run it again.
2. Add a second `printf` call below the first. Both messages should appear in order.
3. Remove the `\n` from the original message. What changes in the output? Why?
4. Replace `\n` with `\t`. What does `\t` do?
5. Delete the `#include <stdio.h>` line. What error do you see? Read it once — you will see this error many more times in your C career.
6. Slip a stray escape into the string, like `\q` or `\z` (K&R exercise 1-2). Does the compiler complain, warn, or silently ignore it?

When the experiments make sense to you, click **next →** to meet variables.
