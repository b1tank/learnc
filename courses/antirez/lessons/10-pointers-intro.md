---
id: 10-pointers-intro
chapter: 5
label: "5.1"
title: Introduction to pointers
prev: 09-game-of-life
next: 11-pointer-arithmetic
status: draft
source:
  videoId: BBgZs-jd_QY
  url: https://www.youtube.com/watch?v=BBgZs-jd_QY
---

> **Source video.** [Let's Learn C — lesson 9](https://www.youtube.com/watch?v=BBgZs-jd_QY) (originally *Corso di programmazione in C — lezione 9: introduzione ai puntatori*) by Salvatore Sanfilippo.

## TL;DR

A pointer is just a variable whose **value is a memory address**. Two operators do all the work: `&x` gives you the address where `x` lives, and `*p` reaches through `p` to the thing it points at. With those, a function can reach back into the caller's variables instead of only returning new values.

## Walkthrough

### Declaring a pointer `[02:01]`

The asterisk in a declaration says "this is a pointer." Salvatore is emphatic about *where* you put it: stick it next to the name, not next to the type.

```c
int  x = 5;     // an int
int *y;         // y is a pointer-to-int
int *a, b;      // a is a pointer, b is a plain int  ← gotcha
```

If you write `int* a, b;` you might *read* "two pointers," but C parses the `*` as binding to `a` only. Putting the star on the variable keeps the grammar honest. Print a pointer with `%p`, not `%d` — it's printed in hex, and freshly-declared pointers are uninitialised, so set them to `NULL` until they point somewhere real.

### `&` takes an address `[04:36]`

`&x` is the **address-of** operator: it asks "where does `x` live in memory?" Assign that to a pointer and the pointer now refers to `x`:

```c
y = &x;   // y holds the address of x
```

One side-effect worth knowing: taking `&x` forces the compiler to actually *put* `x` somewhere addressable in memory. Without it, the optimiser was free to keep `x` in a CPU register (see [Lesson 2](02-dismantling-hello-world.md)).

### `*` dereferences `[06:42]`

In an expression — *not* a declaration — `*p` means "the thing at the address stored in `p`." It works on both sides of `=`:

- `*p = 10;` writes 10 into whatever `p` points at.
- `int v = *p;` reads it back.

The type of the pointer (`int *` vs `char *` vs `struct foo *`) tells the compiler how many bytes to read or write at that address, and how to interpret them. All pointers are addresses; the type is for the compiler, not the CPU.

### Why C needs pointers `[12:35]`

You could mutate `x` directly — but a *function* can't, because C passes arguments by value. To let a callee change the caller's variable, you pass the **address** of that variable and the callee dereferences:

```c
void incr(int *p) { *p = *p + 1; }
// ...
incr(&x);   // x is now one larger
```

Same trick is how a function "returns" more than one value, how `scanf` fills in your variables, and how every non-trivial data structure in C is wired together.

## A tiny demo

`x` lives in memory; `p` is given its address; writing through `*p` mutates `x` itself. The final `printf` reads `x` — which is now whatever we wrote through the pointer.

```c:run
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;
    *p = 100;
    printf("%d\n", x);
    return 0;
}
```

```output
100
```

### The same thing, but through a function

Pass `&x` to `incr`, which holds a copy of the address — not of the value — so its writes land back in `main`'s `x`.

```c:run
#include <stdio.h>

void incr(int *p) { *p = *p + 1; }

int main(void) {
    int x = 5;
    incr(&x);
    incr(&x);
    incr(&x);
    printf("%d\n", x);
    return 0;
}
```

```output
8
```

## Under the hood (asm)

A pointer is *just an integer holding an address*; dereferencing it is one instruction. `gcc -O2 -masm=intel`:

```asm
load:                          ; int  load (int *p)        { return *p; }
        endbr64
        mov     eax, DWORD PTR [rdi]   ; read 4 bytes at address rdi
        ret
store:                         ; void store(int *p, int v) { *p = v;   }
        endbr64
        mov     DWORD PTR [rdi], esi   ; write esi (v) to address rdi (*p)
        ret
```

The square brackets are "the memory at". `DWORD PTR` is just the assembler's hint that we're touching 4 bytes (because `int`). A pointer parameter arrives in `rdi`; "dereference" is the bracketed addressing mode. That's the whole concept.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for register/calling-convention details.

## Try it

1. Change `int *p = &x;` to `int *p = NULL;` and dereference it — what happens? (You're reading address 0; most OSes will kill the program.)
2. Replace `*p = 100;` with `p[0] = 100;` — same result. C treats `p[0]` and `*p` as equivalent; we'll lean on that in the next lesson.
3. Make `incr` take two pointers and swap the values they point at. Test it by printing both variables before and after.

## Cross-reference to K&R

[K&R § 5.1 — Pointers and Addresses](../../kr/lessons/05-01-pointers-and-addresses.md) introduces the same two operators in the same order. Salvatore's version is friendlier about the "why bother?" question by motivating pointers with mutation-through-functions before getting to arrays.

## Go deeper

- `man 3 printf` — see the `%p` conversion and why pointers are typically printed in hex.
- The C FAQ on pointers: <https://c-faq.com/ptrs/index.html> — short answers to the questions everyone asks once they start using `*` and `&` in anger.
- *Pointer Fun with Binky* (Stanford CS Education Library): a 3-minute claymation that nails the mental model — <https://cslibrary.stanford.edu/104/>.
