---
id: 01-hello-world
chapter: 1
label: "1.1"
title: Hello, world - your first C program
prev: null
next: 02-dismantling-hello-world
status: draft
source:
  videoId: HjXBXBgfKyk
  url: https://www.youtube.com/watch?v=HjXBXBgfKyk
  duration: "~30:00"
  date: 2025-05-18
---

> **Source video.** [Let's Learn C - lesson 1](https://www.youtube.com/watch?v=HjXBXBgfKyk) by Salvatore Sanfilippo (antirez).

## TL;DR

C is a **compiled** language: you write a `.c` source file, run it through a compiler (`cc`, which on Linux is usually `gcc` or `clang`), and get a native executable. The classic five-line *Hello, world* exercises the whole pipeline - preprocessor, compiler, linker - and is the smallest useful program you can write. Watch what your compiler does once you turn optimisations on: it may even rewrite your code in ways that change which library function actually gets called.

## Walkthrough

### The five-line program `[05:24]`

Here it is, edit and run it right here in the browser. The runner uses a WebAssembly build of `cc` under the hood, so the experience matches what you'd get on a Linux terminal.

```c:run
#include <stdio.h>

int main(void) {
    printf("Hello, world\n");
    return 0;
}
```

```output
Hello, world
```

Five lines, but a lot is going on in each one:

- `#include <stdio.h>` is a **preprocessor directive** (the `#` is the giveaway). Before the real compile, a separate program - the *preprocessor* - splices the contents of the system header `stdio.h` into your source. That header *declares* `printf` so the compiler knows what arguments it takes; the actual implementation lives in libc and is linked in at the end. `[14:49 → 17:10]`
- `int main(void)` declares the program's entry point. The `int` return type lets the program report success (`0`) or failure (non-zero) back to whatever launched it.
- `printf("Hello, world\n")` calls the standard-library function `printf` from libc. The `\n` is a newline; without it your output would still appear, but no shell prompt would land on the next line.
- `return 0;` is the success exit code. Some C textbooks omit it for `main` (C99 added an implicit `return 0` there) - but write it explicitly. Everywhere else, you'd need it.

### From source to executable `[06:00 → 09:25]`

On a terminal you'd compile the file and run the result like this (you don't need to type this - the in-browser runner does it for you, but it helps to know what's happening):

```
cc helloworld.c       # compile; produces ./a.out by default
./a.out               # run it - prints "Hello, world"
```

`cc` is the *generic* C compiler name; on most Linux systems it's a symlink to either `gcc` (GNU Compiler Collection, the historically important free compiler started by Richard Stallman) or `clang` (the LLVM-based modern alternative). On macOS, `cc` is `clang`. Try `cc --version` to see what yours is.

Without `-o`, the output binary is called `a.out` for historical reasons. Use `-o` to pick a name:

```
cc -o hello helloworld.c
./hello
```

### Peeking inside the binary `[07:48 → 08:37]`

`a.out` is not text - it's a native executable. Two classic tools let you confirm that. First, `file` reports what kind of file something is by inspecting its leading bytes:

```
file a.out
```

```output
a.out: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=..., for GNU/Linux 3.2.0, not stripped
```

On Linux the executable format is **ELF**; on macOS it'd be `Mach-O`, on Windows `PE`. The same C source compiles to a different container on each platform - that's the platform-specific header Salvatore mentions.

To see the raw bytes, dump them with `hexdump`. The first bytes are the ELF *magic number*:

```
hexdump -C a.out | head
```

```output
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
00000010  03 00 3e 00 01 00 00 00  60 10 00 00 00 00 00 00  |..>.....`.......|
00000020  40 00 00 00 00 00 00 00  18 39 00 00 00 00 00 00  |@........9......|
00000030  00 00 00 00 40 00 38 00  0d 00 40 00 1f 00 1e 00  |....@.8...@.....|
```

The four bytes `7f 45 4c 46` are `0x7F` followed by the ASCII letters `E`, `L`, `F` - the signature `file` reads to identify an ELF binary. Even though the file is mostly machine code, human-readable strings (like your `"Hello, world"`) are still embedded in it. `strings` pulls them out:

```
strings a.out | grep Hello
```

```output
Hello, world
```

### What the optimiser does to you `[10:31 → 14:01]`

This is the most interesting part of the video. Compile *without* optimisation and the generated assembly contains a literal `call printf`. Compile with `-O2` (a fairly aggressive but very common optimisation level) and watch this happen:

- The compiler notices your format string has no `%`-conversions - you're not actually formatting anything.
- It rewrites the call to `puts("Hello, world")`, which is faster because it doesn't have to parse a format string at runtime.
- `puts` *also* appends a newline of its own - so the compiler **strips the `\n`** from your string literal to compensate.

This is one of thousands of micro-rewrites a mature C compiler will perform. The takeaway: the C language is small, but the toolchain that turns it into machine code is anything but. The *semantics* you wrote are preserved exactly; the *steps* the CPU runs may differ wildly from what you typed.

If you have `gcc` locally, try it yourself:

```
cc -S -O0 helloworld.c -o nopt.s && grep call nopt.s   # → call printf
cc -S -O2 helloworld.c -o opt.s  && grep call opt.s   # → call puts
```

### Reading the manual `[12:22]`

Every C library function has a manpage. The catch: the shell also has its own `printf` builtin with its own manpage, which `man printf` shows by default. To get the *C* function, ask for **section 3** (library functions):

```
man 3 printf       # the C standard-library function
man 3 puts         # the simpler cousin the optimiser used above
```

This is a habit worth building early: when something behaves unexpectedly, the manpage is almost always the fastest answer.

## Modern note

The video shows `cc helloworld.c` with no flags. For real work, build with at least:

```
cc -std=c11 -Wall -Wextra -O2 -o hello helloworld.c
```

`-std=c11` (or `c17`, or `c23`) pins the language version so the compiler doesn't fall back to a pre-ANSI mode. `-Wall -Wextra` turns on the warnings you actually want. K&R itself predates these flags by decades - modern compilers will accept K&R-style code, but you should not write it.

## Try it

1. **Remove the `\n`** from the string and re-run. What does the output look like? (Hint: the bytes are still printed, but no terminator is emitted, so the runner's display may collapse it with the prompt.)
2. **Change `return 0;` to `return 42;`**. The program still prints normally - the exit code is invisible from inside the program but visible to the shell that launched it (`echo $?` after running it locally).
3. **Try this variant.** It compiles and runs. Predict what it prints *before* you hit Run, then check.

```c:run
#include <stdio.h>

int main(void) {
    printf("Hello,");
    printf(" world\n");
    return 0;
}
```

```output
Hello, world
```

4. **Open question.** Without changing the prose `"Hello, world"`, can you make the program produce *two* lines of output using only one `printf` call? (Look at what `\n` does and try more than one of them.)

## Cross-reference to K&R

This material maps almost exactly onto [K&R § 1.1 - Getting Started](../../../lesson.html?id=01-01-getting-started). Salvatore's treatment adds two things K&R doesn't: a discussion of compiler optimisation levels and their visible effect, and a brief look at how to read manpages. K&R, in turn, goes faster into language features and skips toolchain details.

## Go deeper

- `man 3 printf`, `man 3 puts` - the actual standard-library reference.
- GCC's optimisation flags: <https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html>.
- Matt Godbolt's *Compiler Explorer* (<https://godbolt.org>) lets you paste C code and watch the assembly change live as you toggle optimisation flags - exactly the demo from the video, in your browser.

*Click **next →** to meet C's integer types and `scanf`.*
