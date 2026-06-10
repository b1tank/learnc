---
id: 25-function-pointers
chapter: 9
label: "9.1"
title: Pointers to functions
prev: 24-union-and-bitfield
next: 26-toy-forth-part-1
status: draft
source:
  videoId: OIseV5lcx8w
  url: https://www.youtube.com/watch?v=OIseV5lcx8w
---

> **Source video.** [Let's Learn C - lesson 22](https://www.youtube.com/watch?v=OIseV5lcx8w) by Salvatore Sanfilippo (antirez).

## TL;DR

Functions live in memory too, so their names are addresses you can store and pass around. The type of a pointer to a function returning `R` and taking `(args)` is written `R (*name)(args)` - wrap the name in parens, prepend a `*`. The payoff is that one piece of code can act on *behaviour* the caller plugs in: `qsort`'s comparator, callback registrations, dispatch tables, plugin systems.

## Functions have addresses `[01:25 → 02:24]`

The name of a function, like the name of an array, decays to a pointer. `printf("%p\n", main)` prints the address of `main` itself - different on every run thanks to ASLR, but stable for the duration of one process. What lives at that address is the function's machine code. Calling `main()` from `main()` is a legal expression; without optimisation it grows the stack one frame per call until the stack pages run out and you segfault - the concrete picture of "the stack ran out".

## Declaring a function pointer `[04:53 → 07:00]`

Take the prototype `void hello(void)`, wrap the name in parens, and prepend a `*`:

```
void (*x)(void);   // x is a pointer to a function returning void, taking void
x = hello;         // assign (the function name is already an address)
x();               // call - same syntax as a real function
```

Two functions with the *same prototype* are interchangeable through one pointer. Point `x` at `hello`, call it; point `x` at `bau`, call it again. The pointer type constrains the signature, not the identity.

## Functions that take functions `[08:48 → 12:15]`

Once function pointers are first-class values, you can pass them as parameters and return them from other functions. That gives C its first real taste of higher-order programming - `call_n_times(n, f)` doesn't care what `f` does, only that it has the right signature. This is the leap: code that operates on *behaviour* the caller plugs in.

## `qsort`, the canonical example `[12:48 → 19:17]`

`qsort(base, nmemb, size, cmp)` sorts *any* array. It knows nothing about your element type - it walks `base` in `size`-byte strides and, whenever it needs to order two elements, calls the comparator you handed it. The comparator takes two `const void *` and returns `<0`, `0`, or `>0`:

```c:run
#include <stdio.h>
#include <stdlib.h>

int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int v[] = { 5, 2, 8, 1, 9, 3 };
    size_t n = sizeof v / sizeof v[0];
    qsort(v, n, sizeof v[0], cmp_int);
    for (size_t i = 0; i < n; i++) printf("%d%s", v[i], i + 1 == n ? "\n" : " ");
    return 0;
}
```

```output
1 2 3 5 8 9
```

`qsort` doesn't know an `int` from an alligator; the `void *` arguments hide the element type and you cast back inside the comparator. Avoid the classic `*a - *b` trick: it overflows when the values straddle the integer range (e.g. `10 - INT_MAX`). The `(x > y) - (x < y)` form returns `-1`, `0`, or `1` without ever subtracting, so it is safe even with `INT_MIN`/`INT_MAX`.

## A table of function pointers

Store pointers in an array and pick the operation by index. The two functions share a prototype, so they fit in the same array:

```c:run
#include <stdio.h>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

int main(void) {
    int (*ops[2])(int, int) = { add, mul };
    const char *names[2] = { "add", "mul" };
    for (int i = 0; i < 2; i++) {
        printf("%s: %d\n", names[i], ops[i](3, 4));
    }
    return 0;
}
```

```output
add: 7
mul: 12
```

The declaration `int (*ops[2])(int, int)` reads outwards from `ops`: *array of 2, of pointer to function taking `(int, int)` returning `int`*. The inner parens are mandatory - without them, `int *ops[2](int, int)` parses as something else entirely. When the syntax gets noisy, hide it behind a `typedef int (*binop_t)(int, int);` and write `binop_t ops[2]`. This dispatch-by-table pattern is how the Linux kernel's `struct file_operations` and most plugin systems work.

## Direct vs indirect calls in asm

What does "call through a pointer" actually cost? Compile a direct call and an indirect one and compare. With `gcc -O2 -S -masm=intel`:

```asm
call_direct:                   ; return add(a, b) - add is a known symbol
        endbr64
        lea     eax, [rdi+rsi] ; add inlined away to a single adder
        ret
call_indirect:                 ; return f(a, b) - f is a function-pointer arg
        endbr64
        mov     rax, rdi       ; rax = the function pointer f
        mov     edi, esi       ; shift args left: a into the 1st slot
        mov     esi, edx       ; b into the 2nd slot
        jmp     rax            ; indirect tail-call through the pointer
```

When the target is a known symbol, the compiler can inline it completely - `call_direct` has no call at all, just a `lea` used as an adder. When the target is a value in a register, it has no choice but to go through it (`jmp rax` here as a tail-call; a non-tail call would be `call rax`). The CPU's branch predictor handles a fixed target perfectly but must *guess* an indirect one, and a wrong guess flushes the pipeline. That mispredicted branch is the price of polymorphism in C - and the same primitive Spectre v2 abuses, which is why `endbr64` (Intel CET) marks the legal landing pads for indirect branches.
