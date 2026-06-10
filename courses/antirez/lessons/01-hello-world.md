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

## The five-line program `[05:24]`

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

## From source to executable `[06:00 → 09:25]`

On a terminal you'd compile the file and run the result like this (you don't need to type this - the in-browser runner does it for you, but it helps to know what's happening):

```
cc hello_world.c      # compile; produces ./a.out by default
./a.out               # run it - prints "Hello, world"
```

`cc` is the *generic* C compiler name; on most Linux systems it's a symlink to either `gcc` (GNU Compiler Collection, the historically important free compiler started by Richard Stallman) or `clang` (the LLVM-based modern alternative). On macOS, `cc` is `clang`. Try `cc --version` to see what yours is.

Without `-o`, the output binary is called `a.out` for historical reasons. Use `-o` to pick a name:

```
cc -o hello hello_world.c
./hello
```

## Peeking inside the binary `[07:48 → 08:37]`

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

## What the optimiser does to you `[10:31 → 14:01]`

This is the most interesting part of the video. Compile *without* optimisation and the generated assembly contains a literal `call printf`. Compile with `-O2` (a fairly aggressive but very common optimisation level) and watch this happen:

- The compiler notices your format string has no `%`-conversions - you're not actually formatting anything.
- It rewrites the call to `puts("Hello, world")`, which is faster because it doesn't have to parse a format string at runtime.
- `puts` *also* appends a newline of its own - so the compiler **strips the `\n`** from your string literal to compensate.

This is one of thousands of micro-rewrites a mature C compiler will perform. The takeaway: the C language is small, but the toolchain that turns it into machine code is anything but. The *semantics* you wrote are preserved exactly; the *steps* the CPU runs may differ wildly from what you typed.

If you have `gcc` locally, try it yourself:

```
cc -S -O0 hello_world.c -o nopt.s && grep call nopt.s   # → call printf
cc -S -O2 hello_world.c -o opt.s  && grep call opt.s   # → call puts
```

## Reading the generated assembly `[08:37 → 09:25]`

The `-S` flag stops the compiler *after* it has turned your C into assembly but *before* the assembler turns that into machine code, leaving a human-readable `.s` file you can open in any editor:

```
cc -S hello_world.c      # produces hello_world.s
```

Here is the **entire** `hello_world.s` (x86-64, GCC on Linux). Most of it is *directives* - lines starting with `.` that instruct the assembler rather than producing instructions; the real code is the dozen lines under `main:`:

```
        .file   "hello_world.c"
        .text
        .section        .rodata
.LC0:
        .string "Hello, world\n"
        .text
        .globl  main
        .type   main, @function
main:
        endbr64
        pushq   %rbp
        movq    %rsp, %rbp
        leaq    .LC0(%rip), %rax
        movq    %rax, %rdi
        movl    $0, %eax
        call    printf@PLT
        movl    $0, %eax
        popq    %rbp
        ret
        .size   main, .-main
        .ident  "GCC: (Ubuntu 11.4.0) 11.4.0"
        .section        .note.GNU-stack,"",@progbits
        .section        .note.gnu.property,"a"
        .align 8
        .long   1f - 0f
        .long   4f - 1f
        .long   5
0:
        .string "GNU"
1:
        .align 8
        .long   0xc0000002
        .long   3f - 2f
2:
        .long   0x3
3:
        .align 8
4:
```

This is AT&T syntax, where the **destination is the last operand** (`movq src, dst`). Reading it top to bottom:

- `.file "hello_world.c"` - records the source filename, for debuggers.
- `.text` - switch to the *text* section, where executable code lives.
- `.section .rodata` - switch to *read-only data*. String literals are constants, so they go here, not among the instructions.
- `.LC0:` - a local label naming the address of the string. `LC` means "local constant"; the compiler invents these names.
- `.string "Hello, world\n"` - emit the string's bytes, automatically NUL-terminated. This is the data `printf` will read.
- `.text` again - switch back to the code section to emit `main`.
- `.globl main` - make the `main` symbol visible to the linker (so the C runtime can find it).
- `.type main, @function` - tell the assembler `main` is a function.
- `main:` - the label marking where the function's code begins.

The instructions inside `main`:

- `endbr64` - a control-flow-integrity landing pad (Intel CET). It marks this as a legal target for an indirect call; on older CPUs it's a harmless no-op.
- `pushq %rbp` - save the caller's frame pointer. This and the next line are the standard function **prologue**.
- `movq %rsp, %rbp` - set `%rbp` to the current stack pointer, establishing this function's stack frame.
- `leaq .LC0(%rip), %rax` - **l**oad the *address* of the string into `%rax`. `(%rip)` makes it RIP-relative so the code is position-independent (works wherever the OS loads it).
- `movq %rax, %rdi` - copy that address into `%rdi`. In the System V x86-64 calling convention, `%rdi` holds the **first argument** - so this hands `printf` its format string.
- `movl $0, %eax` - zero `%eax`. For variadic functions like `printf`, the ABI uses `%al` to report how many vector registers carry arguments - here none, so 0.
- `call printf@PLT` - call `printf` through the **PLT** (Procedure Linkage Table), the indirection stub the dynamic linker uses to resolve libc's `printf` at run time.
- `movl $0, %eax` - put `0` in `%eax`. Integer return values come back in `%eax`, so this *is* your `return 0;`.
- `popq %rbp` - restore the caller's frame pointer (the function **epilogue**).
- `ret` - return to whoever called `main` - the C runtime startup code, which then exits the process using `%eax` as the status.

The trailing directives are toolchain bookkeeping you can ignore: `.size` records how many bytes `main` occupies, `.ident` stamps the compiler version into the object file, and the two `.note.*` sections carry metadata (`.note.GNU-stack` marks the stack non-executable; `.note.gnu.property` advertises the CET support that `endbr64` relies on).

(On a recent GCC you may instead see `call puts@PLT` here even without `-O2`: the compiler recognises `printf` with a newline-terminated, conversion-free string as a built-in and folds it to `puts` automatically. Add `-fno-builtin` to see the literal `printf` call shown above.)

## Reading the manual `[12:22]`

Every C library function has a manpage. The catch: the shell also has its own `printf` builtin with its own manpage, which `man printf` shows by default. To get the *C* function, ask for **section 3** (library functions):

```
man 3 printf       # the C standard-library function
man 3 puts         # the simpler cousin the optimiser used above
```

This is a habit worth building early: when something behaves unexpectedly, the manpage is almost always the fastest answer.
