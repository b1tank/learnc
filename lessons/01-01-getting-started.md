---
id: 01-01-getting-started
chapter: 1
label: "1.1"
title: Getting Started
prev: null
next: ex-1-1
status: done
---

`hello, world` looks trivial, but compiling it sets the whole toolchain in motion and running it walks all the way down to the kernel. If you want to eventually understand Rust, Zig, or a JS runtime's internals, this is the floor you build on: a C source file becomes machine code, the loader maps it into a process, and a single line of text reaches your terminal through a *system call*.

```c:run hello.c
#include <stdio.h>

int main(void) {
    printf("hello, world\n");
    return 0;
}
```

```output
hello, world
```

## The pipeline behind one command

`cc hello.c` is really four programs in a trench coat ([Wikipedia: compiler](https://en.wikipedia.org/wiki/Compiler)):

1. **Preprocessor** — `#include <stdio.h>` is literally pasted in (it's just text substitution; the header *declares* `printf`, it does not contain its code).
2. **Compiler** — translates C into target [assembly](https://en.wikipedia.org/wiki/Assembly_language).
3. **Assembler** — turns assembly into an object file (`.o`) of machine code + relocation entries.
4. **Linker** — stitches your `.o` together with the C runtime startup (`crt0`) and libc into an executable ([ELF](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) on Linux).

`main` is **not** the first thing that runs. The loader jumps to `_start` (from [crt0](https://en.wikipedia.org/wiki/Crt0)), which sets up the stack and argument vector, calls `main`, then passes `main`'s return value to `exit()`. That `int` becomes the process **exit status** the shell reads as `$?` — `0` means success by convention.

## `printf` is a library call, not a kernel call

`printf` lives in libc. It formats your string into a userspace buffer, then hands the bytes to the kernel with the [`write(2)`](https://man7.org/linux/man-pages/man2/write.2.html) **system call** — the only way a normal program can touch a terminal, file, or socket. You can skip libc entirely and make that syscall yourself:

```c:run write syscall directly
#include <unistd.h>   /* write() — a thin wrapper over the write(2) syscall */

int main(void) {
    const char msg[] = "hello, world\n";
    write(1, msg, sizeof msg - 1);   /* fd 1 = stdout; -1 drops the '\0' */
    return 0;
}
```

```output
hello, world
```

Same output, one layer lower. `1` is the file descriptor for [standard output](https://en.wikipedia.org/wiki/Standard_streams); `write` is a userspace stub that loads the syscall number and traps into the kernel.

## Newlines and buffering are yours to manage

`printf` never adds a `\n` for you — every line break is one you typed. Adjacent calls with no newline just concatenate:

```c:run no automatic newline
#include <stdio.h>

int main(void) {
    printf("hello, ");
    printf("world");
    printf("\n");
    return 0;
}
```

```output
hello, world
```

stdio is also **buffered**: bytes accumulate in a userspace buffer and flush on a newline (when attached to a terminal), when the buffer fills, or at exit. That's why one big `write` is cheaper than a syscall per character — fewer kernel crossings.

## Go deeper
- [`write(2)` man page](https://man7.org/linux/man-pages/man2/write.2.html) — the syscall under `printf`
- [cppreference: `printf`](https://en.cppreference.com/w/c/io/fprintf) — full format-string spec
- [crt0 / program startup](https://en.wikipedia.org/wiki/Crt0) — what runs before `main`
- [Compiler Explorer (godbolt.org)](https://godbolt.org/) — paste this program and watch it become assembly

