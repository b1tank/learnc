---
id: 02-dismantling-hello-world
chapter: 1
label: "1.2"
title: Dismantling Hello, world — stdio, headers, functions
prev: 01-hello-world
next: 03-local-variable-lifetimes
status: draft
source:
  videoId: Z84vlG1RRtg
  url: https://www.youtube.com/watch?v=Z84vlG1RRtg
---

> **Source video.** [Impariamo il C — lezione 2](https://www.youtube.com/watch?v=Z84vlG1RRtg) by Salvatore Sanfilippo.

## TL;DR

Hello, world is small but every token in it is doing real work. This lesson pulls it apart: what `stdio` actually is and why we `#include` it, how `int main(void)` and any other function are shaped (return type, parameter list, body), what happens when you define a second function and call it from `main`, and a first hint at the fact that arguments and locals only exist while the function is running.

## Walkthrough

### `#include <stdio.h>` is the standard I/O header `[00:00]`

`stdio` is an abbreviation of *standard I/O*. The header declares the input/output functions of the C standard library — `printf`, `puts`, `scanf`, `fopen`, and friends — so the compiler knows their signatures. The implementations themselves live in libc and get linked in at the end. You could hand-write a prototype for `printf` instead of including the header (the previous lesson did exactly that), but in real code you always include the header.

### The shape of a function: `int main(void)` `[00:40 → 03:20]`

Every C function has the same skeleton:

```
return-type  name (parameter-list) { body }
```

So `int main(void)` says: returns `int`, named `main`, takes no arguments. The explicit `void` matters. Writing `int main()` is technically legal in modern C but means "unspecified arguments" rather than "no arguments" — the compiler can't warn you if you accidentally pass some. Compile with `-Wall -Wextra` and prefer `void` when a function takes nothing.

### Defining and calling another function `[03:20 → 05:53]`

`main` is special only in that the OS calls it for you. Any other function you define has to be called explicitly. The video defines a tiny `sum(int a, int b)` and calls it from `main` through `printf`. The format string `"%d"` tells `printf` that an `int` argument will follow — `printf` is *variadic*, so it relies on the format string to know what's actually on the stack.

If the format string and the actual arguments disagree (e.g. you promise two `%d` but supply one), `gcc` will warn even without `-Wall`, and the runtime behaviour is undefined — it might print `0`, garbage, or crash. `[07:16 → 08:11]`

### Locals live only while the function runs `[15:08 → 17:30]`

When `sum(10, 20)` is called, space appears for `a`, `b`, and any local `c` you declare inside. The moment `sum` returns, all three are gone — their storage will be reused by the next call. Function arguments are just locals that the caller pre-fills for you. Holding onto their address after the function returns is a bug (we'll meet pointers later). The appendix video to this lesson shows this on actual assembly; the next lesson here picks the same thread up.

### Why `main` returns an `int` `[17:30 → 20:31]`

The return value of `main` is the program's exit status, visible to the shell as `$?`. Zero means success; non-zero means failure. This is what makes `./build && ./test && ./deploy` work — the shell's `&&` short-circuits the moment any command returns non-zero.

## Demo: define a function, call it from `main`

```c:run define and call sum()
#include <stdio.h>

int sum(int a, int b) {
    return a + b;
}

int main(void) {
    printf("Hello, %d\n", sum(10, 20));
    return 0;
}
```

```output
Hello, 30
```

`sum` is declared *above* `main` so the compiler has already seen its prototype by the time `main` calls it. If you flip the order, you'll either get an implicit-declaration warning or an error depending on the standard — fix it by either moving the definition up or adding a forward prototype (`int sum(int, int);`) before `main`.

## Try it

- Add a second `%d` to the format string but pass only one argument. Compile and observe the warning, then run anyway and see what prints.
- Move `sum`'s definition *below* `main` and recompile with `-Wall`. What does the compiler say?
- Change `return 0;` to `return 1;`, recompile, then in a shell run `./a.out; echo $?`. Try `./a.out && echo ok` too.

## Cross-reference to K&R

This is the same ground as [K&R § 1.7 — Functions](../../kr/lessons/01-07-functions.md): return types, parameter lists, calling a user-defined function from `main`, and what "returning a value" means.

## Go deeper

- [`man 3 printf`](https://man7.org/linux/man-pages/man3/printf.3.html) and [`man 3 stdio`](https://man7.org/linux/man-pages/man3/stdio.3.html) — what `<stdio.h>` actually pulls in.
- [cppreference: `<stdio.h>`](https://en.cppreference.com/w/c/io) — the full list of declarations.
- [cppreference: functions](https://en.cppreference.com/w/c/language/functions) — the exact rules for declarations, definitions, and `void` parameter lists.
- [Wikipedia: translation unit](https://en.wikipedia.org/wiki/Translation_unit_(programming)) — the unit of compilation that `#include` quietly assembles for you.

*Click **next →** to follow locals onto the stack.*
