---
id: 03-local-variable-lifetimes
chapter: 1
label: "1.3"
title: Appendix - the lifetime of local variables
prev: 02-dismantling-hello-world
next: 04-functions-and-expressions
status: draft
source:
  videoId: r6mU_IHXEps
  url: https://www.youtube.com/watch?v=r6mU_IHXEps
---

> **Source video.** [Let's Learn C - appendix to lesson 2](https://www.youtube.com/watch?v=r6mU_IHXEps) by Salvatore Sanfilippo (antirez).

## TL;DR

When we say "a local variable is created on entry and destroyed on return", we mean it literally - it lives either in a CPU register that the next function will trample, or in a slice of the **stack** that the next call will reuse. There is no garbage collector keeping it alive: the storage is gone the moment the function returns.

## Walkthrough

### Why this is a hardware question, not a language question `[01:46 → 02:51]`

A CPU has two places to keep data: a tiny set of named **registers** inside the core, and the larger but slower **RAM**. Instructions either work on registers directly or move bytes between a register and a memory address. C local variables have to live somewhere in that hierarchy, and which one decides their fate.

### Registers are local - and ephemeral `[06:22 → 09:53]`

On the 6502 the accumulator `A` holds the argument passed to `FILL_FIVE`. The very first thing the function does is `TAX` - copy `A` into `X` - because the loop body needs `A` to hold the colour byte `#$05`. The original value of `A` is destroyed three instructions in. That is exactly why C locals "disappear" on return: the registers the compiler chose for them are about to be overwritten by whoever runs next.

### The stack and the calling convention `[11:13 → 13:57]`

Real C compilers need a story that works even when one compilation unit calls another. The 32-bit x86 (i386) convention uses a region of memory called the **stack**, addressed by the `ESP` (stack pointer) register. `PUSH eax` decrements `ESP` by 4 and writes `eax` there; `POP eax` does the reverse. `CALL` also pushes the return address; `RET` pops it back into the program counter.

### A C function, on the stack `[14:39 → 20:29]`

For `sum(a, b)` at `-O0`, the caller pushes `b`, then `a`, then `CALL`s. The callee's prologue is `push ebp; mov ebp, esp` - saving the old base pointer and snapshotting `ESP` into `EBP`. From that frame, `[ebp+8]` is `a` and `[ebp+12]` is `b`. The body reads them, adds, returns in `EAX`. The epilogue pops `EBP`, `RET`s, and the caller does `add esp, 8` to discard the arguments. **Those four bytes that held `a` are still there in RAM** - but the next call will overwrite them, which is exactly the C-level promise that the local is "gone".

### So where do C locals actually live? `[20:29 → 21:06]`

Either in a register that the next instruction may clobber, or in a stack slot that the next `CALL` will reuse. Both are temporary, and that is *the whole reason* you must not return a pointer to a local - the storage it pointed at is about to be recycled.

```c:run lifetime
#include <stdio.h>

void show(int n) {
    int count = 0;        /* fresh storage on every call */
    count += n;
    printf("count=%d\n", count);
}

int main(void) {
    show(10);
    show(5);
    show(1);
    return 0;
}
```

```output
count=10
count=5
count=1
```

`count` is not remembered between calls: each invocation gets its own slot, initialised from scratch. Mark it `static int count = 0;` and the picture changes - that storage lives in the data segment, not on the stack, and you'd get `10, 15, 16`.

## Modern note

Modern x86-64 ABIs pass the first several integer arguments in registers (`rdi`, `rsi`, `rdx`, ...) rather than always on the stack, and optimisers freely keep locals entirely in registers - so the clean `[ebp+8]` picture is a teaching aid, not what `-O2` actually emits.

## Try it

- Paste the snippet into [Compiler Explorer](https://godbolt.org) with `x86-64 gcc -m32 -O0` and find `[ebp+8]` in `show`'s prologue.
- Recompile at `-O2`: `count` and `n` vanish from memory entirely.
- Change `int count = 0;` to `static int count = 0;` and re-run - explain the new output.

## Cross-reference to K&R

[K&R § 4.4 - Scope Rules](../../kr/lessons/04-04-scope-rules.md) covers the lexical side (where a name is visible); this appendix covers the runtime side (where its storage lives, and for how long).

## Go deeper

- [System V i386 calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions#cdecl) - the convention the video walks through.
- [`easy6502` - interactive 6502 assembler](https://skilldrick.github.io/easy6502/) - the simulator from the video.
- [Compiler Explorer](https://godbolt.org) - paste C, see assembly, toggle `-O0` ↔ `-O2`.
- [cppreference: storage duration](https://en.cppreference.com/w/c/language/storage_duration) - the standard's vocabulary for "automatic" vs "static" lifetime.
