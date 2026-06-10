---
id: 00-asm-primer
chapter: 10
label: "10.1"
title: A primer on x86-64 assembly (for C readers)
prev: 37-3d-graphics-basics
next: 36a-6502-detour
status: draft
---

> **What this is.** A short reference card for the assembly deep-dive
> sections sprinkled across the antirez course. Skim it once, then jump back
> here whenever a snippet uses a register, instruction, or convention you
> can't place.
>
> No video accompanies this page - it's a synthetic detour, not a transcript.

## TL;DR

Reading the asm gcc emits is the cheapest way to confirm that the C abstraction
in your head matches the machine the program actually runs on. You don't need
to write asm to benefit; you only need to recognise three things - **what's a
register, what's a memory access, what's a call** - and the rest is vocabulary.

## The mental model

A modern CPU has:

- **Registers** - a tiny, ultra-fast scratchpad (16 general-purpose on x86-64),
  named `rax`, `rbx`, `rdi`, `r8`–`r15`, etc. Lower halves are addressable
  too: `eax` (32-bit), `ax` (16-bit), `al`/`ah` (8-bit).
- **Memory** - your process's virtual address space. Reached only through
  addressing modes like `[rdi]`, `[rdi+8]`, `[rdi+rsi*4]`.
- **Instructions** - `mov` (copy), `add`/`sub`/`xor` (arithmetic/logic),
  `call`/`ret`/`jmp` (control flow), `push`/`pop` (stack), `lea` (compute an
  address without dereferencing it). Each is one or a few clock cycles.

If a C statement involves a value that's already in a register, the compiler
emits zero memory traffic - that's most of what optimisation buys you.

## SysV calling convention (Linux / macOS / BSD on x86-64)

This is the contract every snippet below relies on. Memorising it makes most
asm "make sense" immediately.

| Slot | Register | Notes |
|---|---|---|
| arg 1 | `rdi` | also receives `this` for C++ member calls |
| arg 2 | `rsi` | |
| arg 3 | `rdx` | |
| arg 4 | `rcx` | replaced by `r10` for syscalls (see below) |
| arg 5 | `r8` | |
| arg 6 | `r9` | further args spill onto the stack |
| return value | `rax` | second return word goes in `rdx` |
| callee-saved | `rbx`, `rbp`, `r12`–`r15` | the function must preserve these |
| caller-saved | everything else | the caller assumes they're clobbered |

The shorthand "`mov edi, ...` then `call puts`" you'll see in lesson 02 is
literally "put the argument in `edi`, then jump to `puts`."

## The stack frame

Every function call pushes a **return address** onto the stack. Most functions
also save the previous frame pointer in `rbp` and reserve space for locals:

```text
high addresses
┌─────────────────────────────┐
│ spilled args 7, 8, …        │  ← caller put them here
├─────────────────────────────┤
│ return address              │  ← pushed by `call`
├─────────────────────────────┤
│ saved rbp                   │  ← pushed by callee prologue   ← rbp
├─────────────────────────────┤
│ saved callee-saved regs     │
├─────────────────────────────┤
│ locals                      │                                ← rsp
├─────────────────────────────┤
│ 128-byte red zone           │  (leaf functions only)
└─────────────────────────────┘
low addresses           stack grows ↓
```

The "`endbr64`" you'll see at the top of every function is Intel CET's
landing pad for indirect branches - a security feature, not part of the
calling convention. Tiny leaf functions (no calls, no spills) skip the
prologue entirely and just `ret`.

## System-call ABI (Linux x86-64)

Distinct from the function ABI. When userspace executes `syscall`:

| Slot | Register |
|---|---|
| syscall number | `rax` (e.g. 1 = write, 60 = exit) |
| arg 1 | `rdi` |
| arg 2 | `rsi` |
| arg 3 | `rdx` |
| arg 4 | `r10` ← **not `rcx`**, because `syscall` clobbers `rcx`/`r11` |
| arg 5 | `r8` |
| arg 6 | `r9` |
| return value | `rax` (negative = `-errno`) |

`man syscall` has the full table. macOS's BSD-derived numbers differ.

## How to read `gcc -S` output

```bash
gcc -O2 -S -masm=intel -fno-asynchronous-unwind-tables -o - your.c
```

- `-O2` makes the asm short and idiomatic. At `-O0` every variable spills to
  the stack and the listing triples.
- `-masm=intel` gives `mov dst, src` (left-to-right). Drop it for AT&T syntax
  (`mov src, dst`, register names prefixed with `%`).
- `-fno-asynchronous-unwind-tables` strips the `.cfi_*` directives the
  unwinder needs - fewer lines to scan when you're learning.

Or just paste it into [**Compiler Explorer**](https://godbolt.org/) and watch
the asm regenerate as you type.

## A 6502 detour (8-bit cousin)

The same ideas - registers, memory loads, jumps - live in any ISA, just at
different scales. The **6502** (NES, C64, Apple II, BBC Micro) had three
8-bit registers (`A`, `X`, `Y`) and a 16-bit address bus. Skilldrick's
[easy6502](https://skilldrick.github.io/easy6502/) lets you assemble and run
6502 in the browser - see the [6502 detour](36a-6502-detour.md) page in this
course for an annotated tour.

## Bartlett's *Programming from the Ground Up*

Jonathan Bartlett's free book ([download PDF](https://savannah.nongnu.org/projects/pgubook/))
teaches assembly with **GAS (the GNU assembler)** targeting **i386 Linux**.
It's the best-known "asm-first" tutorial, predates modern x86-64 by a decade,
and uses **AT&T syntax** with direct `int $0x80` system calls - none of which
runs as-is on a modern 64-bit kernel. Read it for the conceptual scaffolding
(what registers feel like, how `call`/`ret` builds the abstraction of
functions, what the linker does); port the snippets to x86-64 / `syscall` /
`as --64` as you go.

## Try it

1. Take any tiny `c:run` block from an earlier lesson, paste it into
   <https://godbolt.org/>, and toggle between `-O0` and `-O2`. Most of the C
   you wrote dissolves at `-O2`.
2. `gcc -O2 -S -masm=intel hello.c -o -` from your terminal. Find the
   `call puts` - the printf-to-puts transformation surprises most newcomers.
3. `objdump -d -M intel a.out | less` on any binary you compiled. That's the
   final reality every C program ships as.

## Go deeper

- [x86-64 SysV ABI](https://gitlab.com/x86-psABIs/x86-64-ABI) - the spec.
- [Intel® 64 and IA-32 Architectures Software Developer's Manual](https://www.intel.com/sdm) - the instruction set itself, free PDF, ~5000 pages.
- [Agner Fog's optimization manuals](https://www.agner.org/optimize/) - what
  the asm actually *costs* on each microarchitecture.
- [Compiler Explorer source on GitHub](https://github.com/compiler-explorer/compiler-explorer)
  - bring your own offline copy.
- [easy6502](https://skilldrick.github.io/easy6502/) - interactive 6502
  tutorial, runs entirely in the browser.

*Continue to the [6502 detour](36a-6502-detour.md), or jump back to any
lesson's assembly deep-dive section.*
