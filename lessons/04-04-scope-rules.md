---
id: 04-04-scope-rules
chapter: 4
label: "4.4"
title: Scope Rules
prev: ex-4-10
next: 04-05-header-files
status: done
---

C has four scopes:

| Scope          | Example                                | Visible from                                  |
|----------------|----------------------------------------|-----------------------------------------------|
| **Block**      | `int x;` inside `{ ... }`              | Declaration line to closing `}` of that block |
| **Function**   | Labels for `goto`                      | Anywhere in the function                      |
| **File**       | `int g;` outside any function          | Declaration to end of file (translation unit) |
| **Function prototype** | `int f(int n)` — the `n`       | Inside the prototype only (a sub-case)        |

The "scope" of a name is *where the compiler looks for that name* when it sees it used.

## Block scope shadowing

A block can declare a variable with the same name as one in an outer scope. Inside the inner block, the inner name wins:

```c:starter
#include <stdio.h>

int x = 100;   /* file scope */

int main(void) {
    printf("outer x = %d\n", x);

    int x = 1;   /* block-scope x, shadows the file-scope one */
    printf("inner x = %d\n", x);

    {
        int x = 2;
        printf("innermost x = %d\n", x);
    }

    printf("back to inner x = %d\n", x);
    return 0;
}
```

```output
outer x = 100
inner x = 1
innermost x = 2
back to inner x = 1
```

Shadowing is *legal* but often a sign that something is going to confuse a future reader. Pick distinct names when you can.

## Storage duration vs scope

Two orthogonal axes:

- **Scope** is where the *name* is visible.
- **Storage duration** is how long the *storage* exists.

```
                  Storage duration
                  | automatic                 | static
Scope -----------|---------------------------|----------------
block            | local variable             | static local (§4.6)
file             | (n/a)                      | external/file-scope variable
```

A `static` declaration at file scope means "file-scope variable but with internal linkage" (next section). A `static` declaration at block scope means "block scope name but with static storage duration" (§4.6).

## Linkage

A third concept that decides "are different `.c` files seeing the *same* object or two objects with the same name":

- **External linkage** — same name in multiple translation units refers to the same object. Default for file-scope variables and functions.
- **Internal linkage** — name is private to its translation unit. File-scope declarations marked `static`.
- **No linkage** — block-scope variables, function parameters; they're unique per declaration.

So:
- `int counter = 0;` at file scope → external linkage (one definition rule across all `.c` files).
- `static int counter = 0;` at file scope → internal linkage (each `.c` file gets its own).
- `int counter = 0;` inside a function → no linkage at all.

## Modern note

C99 lets you declare loop variables in `for` headers, with scope limited to the loop:

```c
for (int i = 0; i < n; ++i) { ... }
/* i no longer exists here */
```

This is the modern way to declare iteration variables. Don't reuse `i` declared at the top of the function — narrow the scope, shorten the lifetime.

## Try it

1. Add another shadowing layer to the example. Notice how each `{ ... }` opens a new scope.
2. Declare a `static int counter = 0;` at file scope in two `.c` files and link them. Confirm they're independent.
3. Try `int i; for (i = 0; i < 10; ++i) {}` vs `for (int i = 0; i < 10; ++i) {}`. The second version is cleaner because `i` doesn't outlive the loop.

## Notes from the author

- Linkage is one of those concepts every C programmer "sort of" knows. The crisp definition — *external means "same object across `.c` files"* — is worth memorising. It explains every "multiple definition" and "undefined reference" linker error.
- Shadowing should be a compiler-checked warning. `-Wshadow` in GCC/Clang catches it. Turn it on in any non-trivial project.
- The scoping rules of C predate every modern language by decades, and most modern languages copy them. JavaScript, C++, Rust, Go — all have block scope as the default and follow C's "innermost declaration wins" rule.

*Click **next →** for header files.*
