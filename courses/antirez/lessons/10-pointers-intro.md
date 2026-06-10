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

> **Source video.** [Let's Learn C - lesson 9](https://www.youtube.com/watch?v=BBgZs-jd_QY) by Salvatore Sanfilippo (antirez).

## TL;DR

A pointer is just a variable whose **value is a memory address**. Two operators do all the work: `&x` gives you the address where `x` lives, and `*p` reaches through `p` to the thing it points at. With those, a function can reach back into the caller's variables instead of only returning new values.

## Declaring a pointer `[02:01]`

The asterisk in a declaration says "this is a pointer." Salvatore is emphatic about *where* you put it: stick it next to the name, not next to the type.

```c
int  x = 5;     // an int
int *y;         // y is a pointer-to-int
int *a, b;      // a is a pointer, b is a plain int  <- gotcha
```

If you write `int* a, b;` you might *read* "two pointers," but C parses the `*` as binding to `a` only. Putting the star on the variable keeps the grammar honest. Print a pointer with `%p`, not `%d` - it shows in hex, and a freshly-declared pointer is uninitialised, so set it to `NULL` until it points somewhere real.

## `&` takes an address `[04:36]`

`&x` is the **address-of** operator: it asks "where does `x` live in memory?" Assign that to a pointer and the pointer now refers to `x`:

```c
y = &x;   // y holds the address of x
```

One side-effect worth knowing: taking `&x` forces the compiler to actually *put* `x` somewhere addressable in memory. Without it, the optimiser was free to keep `x` in a CPU register (see [Lesson 2](02-dismantling-hello-world.md)).

## `*` dereferences `[06:42]`

In an expression - *not* a declaration - `*p` means "the thing at the address stored in `p`." It works on both sides of `=`:

- `*p = 10;` writes 10 into whatever `p` points at.
- `int v = *p;` reads it back.

The type of the pointer (`int *` vs `char *` vs `struct foo *`) tells the compiler how many bytes to read or write at that address, and how to interpret them. All pointers are addresses; the type is for the compiler, not the CPU.

Here it is end to end: `x` lives in memory, `p` is given its address, and writing through `*p` mutates `x` itself. The final `printf` reads `x` - now whatever we wrote through the pointer.

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

## Why C needs pointers `[12:35]`

You could mutate `x` directly - but a *function* can't, because C passes arguments by value. To let a callee change the caller's variable, you pass the **address** of that variable and the callee dereferences:

```c
void incr(int *p) { *p = *p + 1; }
```

`incr` holds a copy of the *address*, not of the value, so its writes land back in `main`'s `x`. Call it three times and `x` climbs:

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

Same trick is how a function "returns" more than one value, how `scanf` fills in your variables, and how every non-trivial data structure in C is wired together.

## A pointer is just an 8-byte address

Salvatore stresses that *all* pointers are the same width regardless of what they point to: a `char *`, an `int *`, and a `struct foo *` are all one machine address. On x86-64 that address is 8 bytes, even when the pointed-to `int` is only 4. The type is bookkeeping for the compiler, not a different size of value.

```c:run
#include <stdio.h>

int main(void) {
    int   x = 5;
    int  *p = &x;
    printf("sizeof(int)  = %zu\n", sizeof(int));
    printf("sizeof(int*) = %zu\n", sizeof(p));
    return 0;
}
```

```output
sizeof(int)  = 4
sizeof(int*) = 8
```

And the address really is a concrete number you can print. The actual value differs every run (the OS loads the stack at a randomised position), but `&x` and a pointer copied from it always agree:

```c:run
#include <stdio.h>

int main(void) {
    int x = 5;
    int *p = &x;
    printf("x  = %d\n", x);
    printf("&x = %p\n", (void *)&x);
    printf("p  = %p\n", (void *)p);
    return 0;
}
```

The two hex addresses print identically because `p` literally holds the result of `&x`.

## What `&` and `*` compile to

A pointer is *just an integer holding an address*; both operators are a single instruction. Compile three one-liners with `gcc -O2 -masm=intel`:

```asm
addr_of:                       ; int *addr_of(void)       { return &g; }
        endbr64
        lea     rax, g[rip]            ; &g: compute the address, touch no memory
        ret
load:                          ; int  load (int *p)       { return *p; }
        endbr64
        mov     eax, DWORD PTR [rdi]   ; *p read: load 4 bytes from address rdi
        ret
store:                         ; void store(int *p, int v){ *p = v;    }
        endbr64
        mov     DWORD PTR [rdi], esi   ; *p write: store esi (v) at address rdi
        ret
```

Taking an address is `lea` - "load effective address" - which computes the number without reading or writing memory. Dereferencing is the bracketed addressing mode `[rdi]`: the square brackets mean "the memory at this address". `DWORD PTR` is just the assembler's hint that we touch 4 bytes (because `int`). A pointer parameter arrives in `rdi`; reading or writing through it is one `mov`. That is the whole concept.
