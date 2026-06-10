---
id: 03-01-statements-and-blocks
chapter: 3
label: "3.1"
title: Statements and Blocks
prev: 02-12-precedence-and-order-of-evaluation
next: 03-02-if-else
status: done
---

A **statement** is C's unit of action - an expression followed by a semicolon (`x = 0;`), or a control construct. The semicolon is a *terminator*, not a separator: every statement needs one. A **block** (or compound statement) is a brace-wrapped group `{ ... }` that the language treats as a single statement *and* introduces a new **scope** - names declared inside vanish at the closing brace. This is how C lets you put several statements where the grammar allows only one, like a loop body.

## Blocks create scope; inner names shadow outer

```c:run blocks and scope
#include <stdio.h>

int main(void) {
    int x = 10;
    {                       /* a nested block: its own scope */
        int x = 20;         /* shadows the outer x - only inside these braces */
        printf("inner x = %d\n", x);
    }
    printf("outer x = %d\n", x);   /* the inner x is gone; this is the 10 */

    for (int i = 0; i < 3; i++)    /* i is scoped to the loop */
        printf("i=%d ", i);
    printf("\n");
    return 0;
}
```

```output
inner x = 20
outer x = 10
i=0 i=1 i=2 
```

The inner `x` doesn't overwrite the outer one - it's a *separate object* living in a separate stack slot, visible only within its block. When the block ends, the name leaves scope. Declaring variables in the smallest block that needs them (and in the `for` header) keeps lifetimes short and bugs local - the opposite of one giant pile of declarations at the top.

## Why the distinction matters

Anywhere the grammar says "statement," you can substitute a block. That's why `if (c) { a(); b(); }` works but `if (c) a(); b();` does *not* group `b()` under the `if` - the block braces are what bind multiple statements together. Forgetting them is the source of the infamous "goto fail" bug. The empty statement `;` and the empty block `{}` are both valid "do nothing" placeholders, useful for loops whose work happens entirely in the header (`while ((c = getchar()) != EOF) ;`).

## Go deeper
- [Statements (C)](https://en.cppreference.com/w/c/language/statements) - the full taxonomy
- [Blocks & scope](https://en.cppreference.com/w/c/language/scope) - block scope and shadowing rules
- [Variable shadowing](https://en.wikipedia.org/wiki/Variable_shadowing) - when an inner name hides an outer one
- [The "goto fail" bug](https://en.wikipedia.org/wiki/Unreachable_code#goto_fail_bug) - what missing braces can cost
