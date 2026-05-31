---
id: 04-08-block-structure
chapter: 4
label: "4.8"
title: Block Structure
prev: 04-07-register-variables
next: 04-09-initialization
status: done
---

C is **block-structured**: a `{ ... }` pair is a *block*, and you may declare variables at the start of any block, not just at the top of a function. Each such variable has scope limited to its block and is created when control enters the block and destroyed when control leaves. Blocks nest, and an inner block may declare a variable with the same name as one in an enclosing block — the inner one **shadows** the outer for the duration of the inner block. This lets you keep a variable's lifetime and visibility as small as the work that needs it.

## Nested blocks, nested scopes

```c:run a name per block level
#include <stdio.h>

int main(void) {
    int x = 1;
    printf("outer x = %d\n", x);
    {                           /* enter inner block */
        int x = 2;              /* a NEW object, shadows the outer x here */
        printf("inner x = %d\n", x);
        {
            int x = 3;          /* shadows again, only inside this block */
            printf("deepest x = %d\n", x);
        }                       /* deepest x destroyed */
    }                           /* inner x destroyed */
    printf("outer x again = %d\n", x);   /* outer x was never touched */
    return 0;
}
```

```output
outer x = 1
inner x = 2
deepest x = 3
outer x again = 1
```

There are three *distinct* objects all named `x`, each living only within its block. Printing after a block closes shows the outer `x` was never modified — the inner ones were separate storage that has already gone away. At the machine level the compiler typically reuses the same stack slots for inner-block locals once they leave scope, since their lifetimes don't overlap; that's why deep nesting doesn't bloat the stack frame.

## Why small scopes are good style

Declaring variables in the **narrowest block that uses them** — rather than all at the top of `main` — is a deliberate practice, not just a convenience. A variable that exists only where it's needed can't be accidentally read or written elsewhere, can't hold a stale value from earlier code, and tells the reader exactly how long it matters. It also helps the optimizer: a tightly-scoped variable is easier to keep in a register. C89 required all declarations at the top of a block; C99 lifted that, so modern C lets you declare a variable right where you first assign it (e.g. `for (int i = 0; ...)`), which is the idiom to prefer. Beware the one trap shadowing brings: reusing `x` at multiple levels is legal but easy to misread — distinct names are usually clearer, and `-Wshadow` will flag it.

## Go deeper
- [Compound statement / block (C)](https://en.cppreference.com/w/c/language/statements#Compound_statements) — what `{ }` means to the compiler
- [Block scope](https://en.cppreference.com/w/c/language/scope) — the visibility rule
- [Variable shadowing](https://en.wikipedia.org/wiki/Variable_shadowing) — the inner-hides-outer pitfall
- [Automatic storage duration](https://en.cppreference.com/w/c/language/storage_duration) — create-on-entry, destroy-on-exit
