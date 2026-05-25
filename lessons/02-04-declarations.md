---
id: 02-04-declarations
chapter: 2
label: "2.4"
title: Declarations
prev: 02-03-constants
next: 02-05-arithmetic-operators
status: done
---

Every variable in C must be **declared** before use. A declaration says "here is a name; here is the type it holds." Optionally it also gives an initial value.

## The shape of a declaration

```c
int    n;              /* uninitialised */
int    m = 0;          /* initialised */
int    a, b, c;        /* three ints, comma-separated */
double pi = 3.14159;
char   ch = 'A';
int    days_in_year = 365;
```

For variables with **automatic storage** (declared inside a function) the initialiser runs every time control flows into the block. If you skip the initialiser, the value is **garbage** — whatever bits happened to be on the stack at that moment.

For variables with **static storage** (declared outside any function, or with `static` inside one), the initialiser runs once, before `main`. If you skip it, the variable is zero-initialised — the standard guarantees that.

## Const

```c
const int  MAX = 100;
const char *name = "Ada";
```

`const` marks a variable as immutable after initialisation. The compiler will refuse `MAX = 200;` later. This is purely a static check — it doesn't change runtime layout.

`const` is also the C equivalent of "this pointer points at read-only data": `const char *p` means *p* can be reassigned but `*p = 'x'` is forbidden. The mirror-image `char * const p` means `p` itself can't be reassigned but `*p = 'x'` is fine. We'll come back to this in chapter 5; pointer-const placement is a recurring source of confusion.

## Where declarations may appear

K&R-era C required all declarations to appear at the top of a block, before any executable statements. C99 relaxed this — you can interleave declarations and statements freely, and you can declare `i` inside the `for` header:

```c
for (int i = 0; i < n; ++i) { ... }
```

Most modern C code uses this style.

```c:starter
#include <stdio.h>

int globals_init   = 42;
int globals_zero;          /* zero-initialised by the language */

int main(void) {
    int  locals_garbage;   /* DON'T read this without writing first */
    int  locals_init = 7;
    const int MAX    = 100;

    printf("static-init  = %d\n", globals_init);
    printf("static-zero  = %d\n", globals_zero);
    printf("locals_init  = %d\n", locals_init);
    printf("MAX (const)  = %d\n", MAX);

    /* Uncomment to see what undefined behaviour looks like:
       printf("locals_garbage = %d\n", locals_garbage); */

    /* Uncomment for a compiler error:
       MAX = 200; */

    return 0;
}
```

```output
static-init  = 42
static-zero  = 0
locals_init  = 7
MAX (const)  = 100
```

## Modern note

Always initialise. The cost is zero (the compiler optimises out dead stores) and you eliminate an entire category of "why is this 32767 only on Tuesdays" bugs. In new code, prefer:

```c
int n = 0;
char buf[256] = {0};   /* zero the whole array */
```

C23 makes `auto` available as a type-deduction keyword (like C++'s), but that's still rare in the wild.

## Try it

1. Declare `int x;` without an initialiser, then `printf("%d\n", x)`. Run a few times — the value may change, may not. That's undefined behaviour.
2. Try to reassign a `const int`. Read the compiler error.
3. Declare a function-local `static int count = 0;` and increment it inside the function. Each call sees the *previous* value. Statics are state that survives function exits.

## Notes from the author

- The "garbage on stack" thing is the entry-level C trap. Modern compilers warn about it at high warning levels (`-Wall -Wmaybe-uninitialized`). Always compile with warnings on.
- `const` in C is mostly documentation — a compiler hint about intent. Casting it away (`(int *)&MAX`) is technically allowed for non-`const`-originated objects, but reaches into undefined behaviour. Don't do it.
- Initialising-at-declaration is one of the cleanest habits to adopt. It limits scope (variables exist only as long as needed) and removes the "did I forget to set this?" check entirely.

*Click **next →** to use the arithmetic operators.*
