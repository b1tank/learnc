---
id: 07-if-goto-recursion
chapter: 3
label: "3.1"
title: if, goto, and recursion
prev: 06-chars-and-strings
next: 08-while-for-switch
status: draft
source:
  videoId: lc7aYXNl1T8
  url: https://www.youtube.com/watch?v=lc7aYXNl1T8
---

> **Source video.** [Let's Learn C - lesson 6](https://www.youtube.com/watch?v=lc7aYXNl1T8) by Salvatore Sanfilippo (antirez).

## TL;DR

C's control flow is small. `if`/`else` picks a branch, `goto label;` jumps to a named point, and a function may call itself. The loop keywords (`while`, `for`, `do-while`) are sugar - every one of them desugars to an `if` plus a `goto` underneath.

## if, else, and blocks `[02:29 → 04:11]`

`if (cond) { ... } else { ... }` - the condition lives in parentheses, each branch is a *block* in curly braces, and `else` is optional. If a branch is a single statement the braces are optional too: `if (i > 3) printf("big\n");` is legal. Indentation does **not** mean anything to the compiler - it scans for the `if`, skips whitespace, finds the next statement, done. `[06:42 → 07:38]` Every coherent style is fine; pick one and stop arguing about it on the internet.

## Blocks scope variables `[07:38 → 09:23]`

A block doesn't have to follow an `if` - you can drop `{ ... }` anywhere a statement is allowed, and any variables you declare inside it live and die with the block. Shadowing an outer name is legal:

```c
int i = 8;
{
    int i = 5;
    printf("%d\n", i);   // 5 - the inner one
}
printf("%d\n", i);       // 8 - the outer one
```

The two `i`s sit at different stack addresses, and the compiler is even free to reuse the same slot for two *sibling* inner blocks, since the outside code is forbidden from peeking in anyway. `[14:24 → 15:42]`

You can watch the two `i`s take separate storage by printing their addresses with `%p` (the pointer specifier) and `&` (address-of), plus their size with `%zu` (the `size_t` specifier `sizeof` returns): `[09:06 → 13:06]`

```c
int i = 8;
printf("outer i = %d at %p, sizeof %zu\n", i, (void*)&i, sizeof(i));
{
    int i = 5;
    printf("inner i = %d at %p, sizeof %zu\n", i, (void*)&i, sizeof(i));
}
```

```output
outer i = 8 at 0x7ffc57837f80, sizeof 4
inner i = 5 at 0x7ffc57837f84, sizeof 4
```

Each `int` is 4 bytes, and the addresses land exactly 4 bytes apart - `...f80` and `...f84`. (Taking `&i` forces the compiler to give each variable a real stack slot rather than keeping it in a register; the exact addresses vary from run to run.)

## goto and labels `[16:22 → 19:17]`

A label is an identifier followed by a colon. `goto label;` jumps to it unconditionally. Labels must start with a letter - you cannot literally write `goto 10`, but `goto L10` is fine, which lets you fake BASIC if the mood strikes. The honest use of `goto` is to build a loop by hand:

```c:run count-with-goto.c
#include <stdio.h>

int main(void) {
    int i = 0;
again:
    printf("%d\n", i);
    i++;
    if (i < 10) goto again;
    return 0;
}
```

```output
0
1
2
3
4
5
6
7
8
9
```

That is exactly what `while (i < 10) { ... }` compiles to: a label at the top, the body, an `if` that jumps back, and an implicit fall-through past the end when the condition finally fails. `[22:38 → 23:20]`

## Recursion is a third option `[26:35 → 28:44]`

A function may also call itself. Give it a base case (an `if` that returns) and a step that shrinks the problem, and the nested calls unwind into the same pattern a loop would walk - no mutable counter, no `goto`:

```c:run factorial.c
#include <stdio.h>

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main(void) {
    printf("%d\n", fact(6));
    return 0;
}
```

```output
720
```

The price is stack memory: every call allocates a fresh frame with its own parameters and locals. Print `&n` from inside `fact` and you'll see the addresses march downward by tens of bytes per level. `[29:22 → 30:37]` A plain loop reuses one slot; this version uses one per level of depth - fine for `n = 6`, less fine for `n = 1_000_000`. The next lesson picks up *tail call optimisation*, the trick that lets a compiler turn certain recursive shapes back into a loop.

## How goto and while compile to the same jump

The claim that "a loop is just a label and a conditional `goto`" is literally true at the instruction level. Take a function whose loop the optimiser can't fold away (the bound comes from outside), and dump it at `-O2`:

```
gcc -O2 -S -masm=intel -fno-asynchronous-unwind-tables -U_FORTIFY_SOURCE jmp2.c -o jmp2.s
```

```asm
sum_to:
        endbr64
        xor     r8d, r8d              ; sum = 0
        xor     eax, eax              ; i = 0
.L2:                                  ; the "again:" label
        add     r8d, eax              ; sum += i
        add     eax, 1                ; i++
        cmp     eax, edi              ; i < n ?
        jl      .L2                   ; if so, jump back to the label
        mov     eax, r8d
        ret
```

`.L2` is the label and `jl .L2` is the `if (i < n) goto again;` - one conditional jump back to the top, exactly what a `while` emits. An *unconditional* `goto` is even plainer: it becomes a bare `jmp`. A hand-written infinite loop compiles to a single instruction that jumps to itself:

```asm
spin:
        endbr64
.L2:
        call    tick@PLT
        jmp     .L2                   ; goto loop;  ->  jmp .L2
```

There is no special "loop" instruction the compiler reaches for here - `while`, `for`, and `goto` all bottom out in the same `cmp`/`jl`/`jmp` machinery.

## How recursion uses the stack

Recursion costs memory because each call needs its own frame. Compile `fact` at `-O0` (no optimisation, so the recursive call is left intact) and the frame setup is right there:

```
gcc -O0 -S -masm=intel -fno-asynchronous-unwind-tables -U_FORTIFY_SOURCE factorial.c -o fact.s
```

```asm
fact:
        endbr64
        push    rbp                    ; save caller's frame pointer
        mov     rbp, rsp
        sub     rsp, 16                ; carve out THIS call's frame
        mov     DWORD PTR -4[rbp], edi ; store n in this frame's slot
        cmp     DWORD PTR -4[rbp], 1
        jg      .L2                    ; n > 1 ? do the recursive step
        mov     eax, 1                 ; base case: return 1
        jmp     .L3
.L2:
        mov     eax, DWORD PTR -4[rbp]
        sub     eax, 1                 ; n - 1
        mov     edi, eax
        call    fact                   ; recurse: pushes a return address,
                                       ; the callee carves its OWN frame
        imul    eax, DWORD PTR -4[rbp] ; n * fact(n - 1)
.L3:
        leave                          ; tear this frame down
        ret
```

Every `call fact` pushes an 8-byte return address, and the callee runs `push rbp` / `sub rsp, 16` again, so each level eats a fresh slice of stack to hold its own `n`. That is why the `&n` addresses in the video march steadily downward: six live frames exist at once when computing `fact(6)`, each remembering the `n` it still has to multiply by on the way back up. A loop keeps one `n` in one slot; recursion keeps one per outstanding call.
