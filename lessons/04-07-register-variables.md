---
id: 04-07-register-variables
chapter: 4
label: "4.7"
title: Register Variables
prev: 04-06-static-variables
next: 04-08-block-structure
status: done
---

`register` was a hint to the compiler that a variable would be used heavily and should, if possible, live in a CPU register rather than memory.

```c
register int i;
for (i = 0; i < n; ++i) {
    /* tight loop */
}
```

In 1978 (and well into the 1990s) this was a meaningful optimisation hint — compilers were primitive, and humans could often pick register-friendly variables better than the compiler's register allocator could.

## Why it's largely obsolete now

Modern C compilers (GCC, Clang, MSVC) all use sophisticated register-allocation algorithms — usually some flavour of graph colouring or linear-scan allocation. They look at *every* variable in scope and pick the best registers globally. A single `register` hint is just noise.

The standard still mandates one effect: **you cannot take the address of a `register` variable**. `&i` where `i` is `register` is a compile error. That's the only behaviour difference today.

```c:starter
#include <stdio.h>

int sum_to(int n) {
    register int sum = 0;       /* hint: keep in register if you can */
    register int i;
    for (i = 1; i <= n; ++i)
        sum += i;
    return sum;
}

int main(void) {
    printf("sum 1..100 = %d\n", sum_to(100));
    return 0;
}
```

```output
sum 1..100 = 5050
```

The compiler will produce the same code with or without the `register` keywords on any non-trivial target.

## When (if ever) to use it

- **Never** for performance reasons in new code. Trust the compiler.
- **Sometimes** as a "don't let me accidentally take the address of this" hint. If you mark a hot-loop counter `register`, you cannot accidentally `&i` it.
- **In documentation** of intent. Reading `register int i` in a tight loop signals "I cared about this being in a register". For some style guides that's worth it; for most it's archaic.

C++17 *deprecated* `register`. C23 has discussed it but the keyword survives as a no-op-with-address-restriction.

## Modern note

If you want to coerce a value into a register today:

- Make the function `static inline` and let the compiler inline it.
- Use `restrict`-qualified pointers (C99) to let the compiler skip aliasing analysis.
- Compile with `-O2` or `-O3` and check the disassembly. The compiler probably did exactly what you wanted.

If you have a hot loop, profile first. Often the bottleneck is memory bandwidth or cache misses, not register usage.

## Try it

1. Compile `sum_to` above with `-O0`, `-O1`, `-O2`. Inspect the assembly (`gcc -S -O2 -o - file.c`). Notice that with `-O2` the function is fully inlined and `register` makes no difference.
2. Try `int *p = &i;` for a `register int i` variable. Read the error.
3. Look at the disassembly of a Linux kernel function. Kernel code uses `register` for ABI-pinning specific variables to specific registers (e.g. `register unsigned long r3 asm("r3")` in PowerPC) — that's a GCC extension, not standard C.

## Notes from the author

- `register` is one of those keywords every C tutorial covers but almost no modern code uses. Read it as "historical context"; don't add it to new code.
- The "no address-of" restriction is the only modern reason to write `register`. It can serve as a "this is a pure value, don't pointer-alias me" marker, but `restrict` and `const` cover that ground better.
- Modern register allocators are good enough that micro-optimisation at the C level rarely beats `-O2`. The lesson generalises: write clear code, profile, and only intervene where the profiler points.

*Click **next →** for block structure and shadowing.*
