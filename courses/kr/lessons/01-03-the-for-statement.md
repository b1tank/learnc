---
id: 01-03-the-for-statement
chapter: 1
label: "1.3"
title: The for Statement
prev: ex-1-4
next: ex-1-5
status: done
---

`for` is not a new kind of loop — it's *syntactic sugar* over `while` that puts the three pieces of every counting loop in one place: **initialize, test, update**. The compiler lowers both to the same thing: a label, a comparison, and a [conditional jump](https://en.wikipedia.org/wiki/Branch_(computer_science)). Understanding that equivalence is the first step toward reading the assembly your loops become.

```c:run temperature table with for
#include <stdio.h>

int main(void) {
    for (int fahr = 0; fahr <= 300; fahr += 20)
        printf("%3d %6.1f\n", fahr, (5.0 / 9.0) * (fahr - 32));
    return 0;
}
```

```output
  0  -17.8
 20   -6.7
 40    4.4
 60   15.6
 80   26.7
100   37.8
120   48.9
140   60.0
160   71.1
180   82.2
200   93.3
220  104.4
240  115.6
260  126.7
280  137.8
300  148.9
```

## `for` and `while` are the same loop

These two compile to essentially identical machine code — an entry test, the body, the update, and a jump back:

```text
for (init; test; update)      init;
    body;            ==>      while (test) { body; update; }
```

The `for` form just keeps the loop's bookkeeping from scattering across the function. Each clause is optional: `for (;;)` is the idiomatic infinite loop (the missing test is treated as always-true).

```c:run for and while are equivalent
#include <stdio.h>

int main(void) {
    for (int i = 0; i < 3; i++)
        printf("for  %d\n", i);

    int i = 0;
    while (i < 3) {                 /* same three pieces, spread out */
        printf("while %d\n", i);
        i++;
    }
    return 0;
}
```

```output
for  0
for  1
for  2
while 0
while 1
while 2
```

## Under the hood: what a loop becomes

A loop is a backward [branch](https://en.wikipedia.org/wiki/Branch_(computer_science)). The counter usually lives in a CPU register; each iteration is a `cmp` (compare) followed by a conditional jump back to the top. On x86‑64 a `for (i=0; i<n; i++)` body is roughly:

```text
        mov   ecx, 0          ; i = 0
.top:   cmp   ecx, n          ; test i < n
        jge   .done           ; if not, exit
        ...body...
        inc   ecx             ; i++
        jmp   .top
.done:
```

No iterator object, no bounds checking — just registers and jumps. That's why C loops are fast and also why an off‑by‑one walks straight off the end of an array. Paste any loop into [Compiler Explorer](https://godbolt.org/) to see the real instructions.

## Scope of the loop variable

Declaring the counter *in* the `for` (`for (int i = ...)`) scopes it to the loop — it doesn't leak afterward. That's a C99 feature; pre‑ANSI K&R declared it outside. Keeping it inside is the modern default and prevents accidental reuse.

```c:run loop-local scope
#include <stdio.h>

int main(void) {
    int total = 0;
    for (int i = 1; i <= 5; i++)
        total += i;              /* i exists only inside the loop */
    printf("sum 1..5 = %d\n", total);
    return 0;
}
```

```output
sum 1..5 = 15
```

## Go deeper
- [Control flow & branches](https://en.wikipedia.org/wiki/Control_flow) — loops, jumps, structured programming
- [`for` statement reference](https://en.cppreference.com/w/c/language/for) — exact semantics of each clause
- [Loop optimization](https://en.wikipedia.org/wiki/Loop_optimization) — unrolling, strength reduction, what the compiler does
