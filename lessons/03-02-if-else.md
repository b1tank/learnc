---
id: 03-02-if-else
chapter: 3
label: "3.2"
title: If-Else
prev: 03-01-statements-and-blocks
next: 03-03-else-if
status: done
---

The basic conditional in C:

```c
if (expression)
    statement1
else
    statement2
```

The `else` and its statement are optional. Each branch can be a single statement or a block.

```c:starter
#include <stdio.h>

int main(void) {
    int n = 7;

    if (n > 0)
        printf("positive\n");
    else if (n < 0)
        printf("negative\n");
    else
        printf("zero\n");

    return 0;
}
```

```output
positive
```

## The "dangling else" trap

What does the `else` belong to?

```c
if (a)
    if (b)
        x = 1;
    else            /* attaches to which if? */
        x = 2;
```

C's rule: `else` binds to the **nearest** unmatched `if`. So the `else` above pairs with `if (b)`, not `if (a)`. The indentation in the example is misleading. With explicit braces the meaning is unambiguous:

```c
if (a) {
    if (b)
        x = 1;
    else
        x = 2;
}
```

This is the main reason "always brace your `if`s" is a real style rule.

## Truthy and falsey

The condition is any expression. C treats **0 as false, anything non-zero as true**. So all of these are equivalent:

```c
if (n != 0) ...
if (n)      ...
if (n ? 1 : 0) ...
```

The "implicit comparison to zero" is idiomatic for pointers (`if (p)` means "p is non-NULL"), for boolean flags (`if (found)`), and for "is the value non-zero" tests (`if (x % 2)`). For numeric quantities where 0 is a meaningful value (not just "no flag"), prefer the explicit `!= 0`.

## The `=` vs `==` mistake (again)

```c
if (x = 0) ...    /* assigns 0, tests 0; never taken */
if (x == 0) ...   /* equality */
```

Compile with `-Wall` and modern compilers will warn. If you really mean assignment-as-condition, double-paren it: `if ((x = next())) ...` — the extra parens tell the compiler "yes, I meant that."

## Modern note

Use `<stdbool.h>` for clearer boolean variables in C99+ code:

```c
#include <stdbool.h>
bool ready = false;
/* ... */
if (ready) { ... }
```

No performance cost; the type signals intent.

## Notes from the author

- The dangling-else is the kind of thing every C textbook warns about and most programmers forget by the time they encounter it in real code. Brace religiously and the problem disappears.
- `if (p)` for pointers is so widely used that some style guides ban it (insisting on `if (p != NULL)`) for explicitness. Pick one; be consistent. Mixing the two within a project signals "we never had a style discussion."
- The "non-zero is true" convention is what makes `while ((c = getchar()) != EOF)` work and lets `strcmp` return *any* non-zero value for "different". Don't conflate "true" with `1`; conflate it with "non-zero".

*Click **next →** for the else-if chain.*
