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

## Two places to keep data: registers and RAM `[01:46 → 02:51]`

The question "what does it mean that a local variable is destroyed?" is really a hardware question. A CPU keeps data in two kinds of place: a tiny set of named **registers** inside the core - fast, but only a handful of them - and the much larger but slower **RAM**. Instructions either operate on registers directly or move bytes between a register and a memory address. Every C local has to live in one of those two places, and which one it lands in decides how long it survives.

## Registers are local - and ephemeral `[06:22 → 09:53]`

On the 6502 - the Commodore 64's CPU, simple enough to read by hand - the accumulator `A` holds the argument passed to `FILL_FIVE`. The first thing the function does is `TAX`, copying `A` into `X`, because the loop is about to reload `A` with the colour byte `#$05`. Three instructions in, the original argument in `A` is already gone. That is exactly why C locals "disappear": the register the compiler parked them in is about to be reused by whatever runs next. If `FILL_FIVE` then called another function, `A` would be overwritten again - the value is kept nowhere unless the code deliberately saves it somewhere else.

## The stack and the calling convention `[11:13 → 13:57]`

Registers alone are not enough once one separately-compiled function has to call another. They agree through a **calling convention** - a fixed contract for how arguments are passed and who is responsible for saving what - and the classic 32-bit x86 (i386) convention uses a region of RAM called the **stack**, tracked by the `ESP` (stack pointer) register. `PUSH eax` decrements `ESP` by 4 and writes `eax` at the new top; `POP eax` reads it back and increments `ESP` by 4. `CALL` also pushes the return address before jumping; `RET` pops it back into the program counter. Because the convention is fixed for the architecture, code built by different compilers can still call into each other and agree on where the arguments are.

## A C function on the stack `[14:39 → 20:29]`

Take the `sum(a, b)` from the previous lesson, compiled for i386 at `-O0`. The caller pushes the arguments in reverse - `b` first, then `a` - and `CALL`s. `sum`'s **prologue** is `push ebp; mov ebp, esp`: it saves the caller's base pointer, then snapshots `ESP` into `EBP` so the frame has a fixed anchor even as `ESP` keeps moving. Relative to that anchor, `[ebp+8]` is the first argument and `[ebp+12]` is the second - and between them, at `[ebp+4]`, sits the return address `CALL` pushed. The body reads them, adds, and leaves the result in `EAX`. The **epilogue** restores `EBP` and `RET`s; back in the caller, `add esp, 8` discards the two arguments. The four bytes that held `a` are still sitting in RAM - but the next `CALL` will write straight over them, which is precisely the C-level promise that the local is "gone".

## The real i386 stack frame

The video does that walk by hand. Here is the assembly gcc actually emits, so every step maps to a real instruction. Compile the same two functions for 32-bit x86 at `-O0`:

```
gcc -m32 -O0 -S -masm=intel -fno-pic sum.c -o sum.s
```

```asm
sum:
        push    ebp                       ; save caller's base pointer
        mov     ebp, esp                  ; anchor this frame in EBP
        mov     edx, DWORD PTR [ebp+8]    ; edx = a  (first argument)
        mov     eax, DWORD PTR [ebp+12]   ; eax = b  (second argument)
        add     eax, edx                  ; eax = a + b
        pop     ebp                        ; restore caller's base pointer
        ret                                ; return; result is in eax
```

The `[ebp+8]` / `[ebp+12]` offsets are exactly the ones the video points at. The caller side is just as literal:

```asm
main:
        push    ebp
        mov     ebp, esp
        push    20                        ; second argument, pushed first
        push    10                        ; first argument
        call    sum                       ; pushes return address, then jumps
        add     esp, 8                    ; discard the two arguments
        leave                             ; mov esp, ebp ; pop ebp
        ret
```

No hand-waving: the arguments really are two `push`es, and `add esp, 8` really does throw them away the instant `sum` returns.

## So where do C locals actually live? `[20:29 → 21:06]`

Either in a register the next instruction may clobber, or in a stack slot the next `CALL` will reuse. Both are temporary, and that is the whole reason you must never return a pointer to a local - the storage it pointed at is about to be recycled. You can watch a local refuse to remember anything between calls:

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

`count` is not carried over: each call gets a fresh slot, re-initialised to `0` before `n` is added. Mark it `static int count = 0;` and the storage moves out of the stack frame into the data segment, lives for the whole program, and the three calls print `10`, `15`, `16` instead.

## Locals on the stack at -O0, on x86-64

The video uses i386 because its frames are the easiest to read, but the same idea is visible on the 64-bit machine you are probably sitting at. Compile `show` from above at `-O0`:

```asm
show:
        push    rbp
        mov     rbp, rsp
        sub     rsp, 32                   ; reserve room for this frame's locals
        mov     DWORD PTR -20[rbp], edi   ; spill argument n into a stack slot
        mov     DWORD PTR -4[rbp], 0      ; count = 0
        mov     eax, DWORD PTR -20[rbp]   ; eax = n
        add     DWORD PTR -4[rbp], eax    ; count += n
        mov     eax, DWORD PTR -4[rbp]
        mov     esi, eax                  ; 2nd printf arg = count
        lea     rax, .LC0[rip]
        mov     rdi, rax                  ; 1st printf arg = "count=%d\n"
        mov     eax, 0
        call    printf@PLT
        nop
        leave                             ; tear the frame down
        ret
```

Two differences from i386, both modern-ABI conveniences: the first integer argument arrives in a **register** (`edi`) rather than on the stack, and `show` immediately **spills** it into a stack slot (`-20[rbp]`) so it has an address. `count` gets its own slot at `-4[rbp]`. Both slots are reclaimed by `leave` on the way out. Turn the optimiser up to `-O2` and `n` and `count` stop touching memory entirely - they live their whole lives in registers - so the tidy `[ebp+8]` picture is a teaching aid, not a guarantee about any particular build.
