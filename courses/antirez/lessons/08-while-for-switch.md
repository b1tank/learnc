---
id: 08-while-for-switch
chapter: 3
label: "3.2"
title: while vs for, and the switch statement
prev: 07-if-goto-recursion
next: 09-game-of-life
status: draft
source:
  videoId: HCRthhjbfAg
  url: https://www.youtube.com/watch?v=HCRthhjbfAg
---

> **Source video.** [Let's Learn C - lesson 7](https://www.youtube.com/watch?v=HCRthhjbfAg) by Salvatore Sanfilippo (antirez).

## TL;DR

Every `for` loop is just a `while` with extra slots for *init*, *test*, and *step* - once you see the rewrite, you can read any C loop. `switch` is C's multi-way branch on an integer value, with two sharp edges to remember: cases **fall through** unless you write `break`, and you can't declare a variable directly under a `case` label without opening a block.

## for is sugar for while `[09:36 → 10:58]`

The C `for (init; test; step) body` rewrites mechanically into `init; while (test) { body; step; }`. Salvatore demonstrates by deleting one piece of the `for` header at a time: drop the `init` and you initialise `i` above the loop; drop the `test` and you need an inner `break` to escape; drop the `step` and you advance `i` yourself. Strip all three and you're left with `for (;;) { … }` - the canonical C infinite loop, equivalent to `while (1)`.

The two forms run the same way. Here is a count to 4 written both as a `while` and as a `for`:

```c:run
#include <stdio.h>

int main(void) {
    /* while form */
    int i = 0;
    while (i < 5) {
        printf("%d ", i);
        i++;
    }
    printf("\n");

    /* for form -- identical behaviour */
    for (int j = 0; j < 5; j++) {
        printf("%d ", j);
    }
    printf("\n");
    return 0;
}
```

```output
0 1 2 3 4 
0 1 2 3 4 
```

The `for` just hoists the init and step into the header so the body stays focused on the work.

## break, and where the loop variable lives `[13:25 → 14:44]`

C99 lets you declare the counter inside the header: `for (int i = 0; i < 10; i++)`. Cleaner, but `i` then **doesn't exist after the loop** - print it on the next line and you get a compile error. When you need to inspect the index *after* the loop (e.g. to tell whether a search hit or ran off the end of the array), declare `i` outside.

## switch is a jump table, not a chain of ifs `[20:35 → 24:49]`

`switch (expr)` dispatches on an integer (or `char`, or `enum`). Each `case LABEL:` is literally a label - like a `goto` target - and the compiler may lower the whole construct to a *jump table* for speed. Two consequences:

- **Fall-through is the default.** Without `break`, execution keeps running into the next `case`. Sometimes you want that (grouping cases); usually it's a bug.
- **You can't declare a variable straight under `case`.** Wrap the body in `{ … }` first - blocks can appear anywhere in C.

`default:` runs when no `case` matches; it's the `else` of the `switch`. Here is a small `switch` that exercises both kinds of fall-through:

```c:run
#include <stdio.h>

int main(void) {
    int n = 5;

    switch (n) {
    case 1:
    case 2:
    case 3:
        printf("small\n");
        break;
    case 5:
        printf("it's a 5\n");
        /* no break -> falls through */
    case 7:
        printf("it's a 7\n");
        break;
    default:
        printf("some other number\n");
        break;
    }
    return 0;
}
```

```output
it's a 5
it's a 7
```

Two things to notice. `case 1:` and `case 2:` fall through to `case 3:` *on purpose* - that's the idiomatic way to group values. Then `case 5:` falls through to `case 7:` *by accident*, because the `break` is missing - exactly the bug Salvatore demonstrates in the video. Change `n` to `2` to see the grouped path, or to `10` to hit `default`.

## for and while compile to the same branches

The "`for` is a masked `while`" claim is checkable: compile two functions that sum `0..n-1`, one written as a `while` and one as a `for`, and diff the assembly. At `-O2`:

```
gcc -O2 -S -masm=intel -fno-asynchronous-unwind-tables -U_FORTIFY_SOURCE forwhile.c -o fw.s
```

```asm
with_while:                           with_for:
        endbr64                               endbr64
        test    edi, edi                      test    edi, edi
        jle     .L4                           jle     .L10
        xor     eax, eax                      xor     eax, eax
        xor     r8d, r8d                      xor     r8d, r8d
.L3:                                  .L9:
        add     r8d, eax                      add     r8d, eax
        add     eax, 1                        add     eax, 1
        cmp     edi, eax                      cmp     edi, eax
        jne     .L3                           jne     .L9
        mov     eax, r8d                      mov     eax, r8d
        ret                                   ret
```

The two functions are instruction-for-instruction identical; only the auto-generated label numbers differ (`.L3` vs `.L9`). The compiler does the `for`-to-`while` rewrite before it ever reaches code generation, so by the time machine code exists there is no trace of which keyword you typed.

## A switch becomes a jump table

When the cases are small and dense, the compiler doesn't emit a chain of comparisons - it builds a *jump table*: an array of code addresses it indexes with the switch value. Compile a five-way dispatch at `-O2`:

```
gcc -O2 -S -masm=intel -fno-asynchronous-unwind-tables -U_FORTIFY_SOURCE jt.c -o jt.s
```

```asm
dispatch:
        endbr64
        cmp     edi, 4                ; out of [0,4] range?
        ja      .L1                   ; if so, skip the whole switch
        lea     rdx, .L4[rip]         ; rdx = base of the jump table
        mov     edi, edi
        movsx   rax, DWORD PTR [rdx+rdi*4] ; load table[x]
        add     rax, rdx              ; turn offset into an address
        notrack jmp     rax           ; one indirect jump to the case
```

There is no `cmp x,0 / cmp x,1 / cmp x,2 ...` ladder: a single bounds check, one table lookup, one indirect `jmp`. The table itself sits in read-only data, holding a relative offset per case:

```asm
.L4:
        .long   .L8-.L4               ; case 0 -> a()
        .long   .L7-.L4               ; case 1 -> b()
        .long   .L6-.L4               ; case 2 -> c()
        .long   .L5-.L4               ; case 3 -> d()
        .long   .L3-.L4               ; case 4 -> e()
```

Dispatch is now O(1) regardless of how many cases there are - that's the speed advantage over a chain of `if`s. Make the case values sparse (say `0`, `100`, `10000`) and the compiler gives up on the table and falls back to comparisons, because a table indexed by value would be mostly empty.
