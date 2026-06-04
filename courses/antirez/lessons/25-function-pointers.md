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

> **Source video.** [Let's Learn C — lesson 22](https://www.youtube.com/watch?v=OIseV5lcx8w) (originally *Corso di programmazione in C — lezione 22: i puntatori a funzione*) by Salvatore Sanfilippo.

## TL;DR

Functions live in memory too, so their names are addresses you can store and pass around. The type of a pointer to a function returning `R` and taking `(args)` is written `R (*name)(args)` — wrap the name in parens, prepend a `*`. The payoff is that one piece of code can act on *behaviour* the caller plugs in: `qsort`'s comparator, callback registrations, dispatch tables, plugin systems.

## Walkthrough

### Functions have addresses `[01:25 → 02:24]`

The name of a function, like the name of an array, decays to a pointer. `printf("%p\n", main)` prints the address of `main` itself — different on every run thanks to ASLR, but stable for the duration of one process. Calling `main()` from `main()` is a legal expression; without optimisation it grows the stack one frame at a time until you crash with a segfault, which is exactly the picture of "the stack runs out of pages".

### Declaring a function pointer `[04:53 → 07:00]`

Take the prototype `void hello(void)`, wrap the name in parens, and prepend a `*`:

```
void (*x)(void);   // x is a pointer to a function returning void, taking void
x = hello;         // assign
x();               // call — same syntax as a real function
```

Two functions with the *same prototype* are interchangeable through one pointer. Point `x` at `hello`, call it; point `x` at `bau`, call it again. The pointer type only constrains the signature, not the identity.

### Functions that take functions `[08:48 → 12:15]`

Once function pointers are first-class values, you can pass them as parameters and return them from other functions. That gives C its first real taste of higher-order programming — `call_n_times(n, f)` doesn't care what `f` does, only that it has the right signature.

### `qsort` is the canonical example `[12:48 → 19:17]`

`qsort(base, nmemb, size, cmp)` sorts *any* array. It knows nothing about your element type — it just walks `base` in `size`-byte strides. The bridge to your data is the comparator you pass: a function that takes two `const void *` pointers and returns `<0`, `0`, or `>0`. This is how a library written years before your code can still sort your data.

Be careful with the classic `*a - *b` trick: it overflows when the two values straddle the integer range. Use explicit comparison (`(x > y) - (x < y)`) instead.

## A table of function pointers

Pick the operation by index and call through the pointer. The two functions share a prototype, so they fit in the same array.

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

The declaration `int (*ops[2])(int, int)` reads outwards from `ops`: *array of 2, of pointer to function taking `(int, int)` returning `int`*. The inner parens are mandatory — without them, `int *ops[2](int,int)` would be parsed as a function returning a pointer.

## `qsort` with a custom comparator

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

`qsort` doesn't know an `int` from an alligator. The `void *` arguments hide the element type; you cast back inside the comparator. The `(x > y) - (x < y)` form returns `-1`, `0`, or `1` without ever subtracting — no overflow risk even with `INT_MIN`/`INT_MAX`.

## Modern note

Function-pointer declarations get unreadable fast. Hide the syntax behind a `typedef`:

```
typedef int (*binop_t)(int, int);
binop_t ops[2] = { add, mul };
```

This is also how most real APIs document their callback types (`pthread_create` takes a `void *(*)(void *)`; libcurl's `CURLOPT_WRITEFUNCTION` is a typedef'd signature). If your call site looks like noise, the fix is a typedef, not a comment.

## Under the hood (asm)

Direct vs indirect call, distilled:

```asm
call_direct:                   ; calls the known symbol `add`
        endbr64
        jmp     add            ; tail-call: literal address baked into the jump
                               ; (branch predictor: "I know where this goes")
call_indirect:                 ; calls through `op f`, a function-pointer arg
        endbr64
        mov     rax, rdi       ; save the function pointer
        mov     edi, esi       ; shift args left: drop f, promote a, b
        mov     esi, edx
        jmp     rax            ; indirect tail-call — predictor must GUESS
```

Direct calls have one literal target the CPU's branch predictor pre-fetches perfectly. Indirect calls go through a register; a wrong guess flushes the pipeline (≈20+ cycles wasted). This is the same primitive Spectre v2 abuses and that retpolines + Intel CET's `endbr64` are designed to harden. The cost of "polymorphism in C" is exactly one mispredicted branch per dispatch.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for register/calling-convention details.

## Try it

1. Add a third entry `int sub(int, int)` to `ops[]` and a matching `"sub"` to `names[]`. Predict the new output before you run.
2. Change the comparator to sort *descending* — swap the arguments to the comparison, or negate the result.
3. Replace `int (*ops[2])(int, int)` with a `typedef`'d version (`typedef int (*binop_t)(int, int);`) and confirm the program is unchanged.

## Cross-reference to K&R

[K&R § 5.11 — Pointers to Functions](../../kr/lessons/05-11-pointers-to-functions.md) builds the same machinery to sort lines of text, with an option to compare numerically — essentially a hand-rolled `qsort` with a pluggable comparator. K&R also walks through reading the declaration `char (*(*x())[])()` aloud, which is the prose version of the typedef advice above.

## Go deeper

- cppreference, [Pointer declarators — pointers to functions](https://en.cppreference.com/w/c/language/pointer#Pointers_to_functions): the formal grammar and conversion rules.
- [The C Declaration Maze (cdecl.org)](https://cdecl.org/): paste any C declaration and get an English translation. Indispensable for function-pointer-of-arrays-of-pointer-to-function declarations.
- `man 3 qsort`, `man 3 bsearch`: two standard-library functions whose entire API surface is one function pointer.
- Linux kernel `struct file_operations` (`include/linux/fs.h`): a real-world dispatch table where every field is a function pointer — the same idea, at production scale.

*Click **next →** for the first instalment of the toy-Forth interpreter, where function pointers earn their keep.*
