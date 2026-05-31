---
id: 04-07-register-variables
chapter: 4
label: "4.7"
title: Register Variables
prev: ex-4-11
next: 04-08-block-structure
status: done
---

`register` is a **hint** to the compiler: "this variable is used so heavily, try to keep it in a [CPU register](https://en.wikipedia.org/wiki/Processor_register) instead of [main memory](https://en.wikipedia.org/wiki/Random-access_memory)." Registers are the fastest storage a processor has — a handful of slots right inside the CPU — so a hot loop counter living in a register avoids a memory round-trip on every iteration. The one hard rule the keyword enforces: you may **not** take the address (`&`) of a `register` variable, because a value in a register has no memory address.

## A hint, not a command

```c:run register-qualified loop counter
#include <stdio.h>

int main(void) {
    register int i;             /* "keep i in a register if you can" */
    long sum = 0;
    for (i = 1; i <= 100; i++)
        sum += i;
    printf("sum 1..100 = %ld\n", sum);
    return 0;
}
```

```output
sum 1..100 = 5050
```

Functionally this is identical to a plain `int i` — the result is the same; `register` only *suggests* faster placement. Crucially, the compiler is free to ignore it, and on any modern compiler it *does* ignore it: optimizers already perform [register allocation](https://en.wikipedia.org/wiki/Register_allocation) far better than a human annotation could, deciding per-region which variables live in which registers. So in practice `register` changes nothing about the generated code at `-O2`.

## Why it's effectively obsolete

The keyword dates to the 1970s, when compilers were simple and a programmer's hint genuinely helped. Today its only observable effect is the `&`-is-forbidden restriction; for performance it's dead weight, and C++17 even removed it from that language. Treat it as historical: understand what it *meant* (a placement hint reflecting the CPU/memory speed gap) so you recognize it in old code, but don't reach for it — write clear code and let the optimizer allocate registers. If you ever want to *see* register allocation happen, compile with optimization and read the assembly on [Compiler Explorer](https://godbolt.org/).

## Go deeper
- [`register` storage class (C)](https://en.cppreference.com/w/c/language/storage_duration) — the hint and its one rule
- [Register allocation](https://en.wikipedia.org/wiki/Register_allocation) — what the compiler does instead
- [Processor register](https://en.wikipedia.org/wiki/Processor_register) — the hardware being hinted at
- [Compiler Explorer](https://godbolt.org/) — watch variables land in registers
