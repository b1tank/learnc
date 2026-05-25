---
id: 04-05-header-files
chapter: 4
label: "4.5"
title: Header Files
prev: 04-04-scope-rules
next: 04-06-static-variables
status: done
---

A **header file** (typically `*.h`) holds the *declarations* (function prototypes, type definitions, macros, extern variables) that multiple `.c` files share. Each `.c` file `#include`s the headers it needs; the preprocessor literally pastes the header's text into the file.

## Why headers exist

C has no module system. The compiler sees one translation unit at a time and needs *every* name's type before it can generate correct code. If `main.c` calls `push`, `main.c` must contain a prototype `void push(double);` somewhere above the call. Repeating that prototype in every `.c` file is fragile (change a signature, hunt every callsite). Headers centralise the contract.

## A small layout

```c:starter
/* calc.h — the public contract */
#ifndef CALC_H        /* include guard, see below */
#define CALC_H

#define MAXVAL 100

extern int sp;
extern double val[MAXVAL];

void   push(double);
double pop(void);
void   show_top(void);

#endif /* CALC_H */
```

```c
/* stack.c — implementation, owns the storage */
#include "calc.h"
#include <stdio.h>

int sp = 0;
double val[MAXVAL];

void push(double f) {
    if (sp < MAXVAL) val[sp++] = f;
    else             fprintf(stderr, "stack full\n");
}

double pop(void) {
    return (sp > 0) ? val[--sp] : 0.0;
}

void show_top(void) {
    if (sp > 0) printf("top = %g (%d)\n", val[sp-1], sp);
}
```

```c
/* main.c — consumer */
#include "calc.h"

int main(void) {
    push(2.0);
    push(3.0);
    push(pop() + pop());
    show_top();
    return 0;
}
```

Build: `gcc main.c stack.c -o calc`. The two `.c` files compile separately, each one sees `calc.h`, and the linker fuses them.

## Include guards (or `#pragma once`)

If `calc.h` is `#include`d transitively twice, you'll get errors about duplicate definitions of `MAXVAL`, duplicate prototypes, etc. The fix is an **include guard**:

```c
#ifndef CALC_H
#define CALC_H
/* ... contents ... */
#endif
```

The first include sets `CALC_H`, the second include sees it already defined and skips the body. Equivalently and more concisely, all mainstream compilers accept:

```c
#pragma once
```

at the top of the header. Use whichever your project standardises on. Both are zero-cost.

## What belongs in a header

- Type definitions (`typedef`, `struct` forward decls or full defs depending on need).
- Function prototypes.
- `extern` variable declarations.
- Inline functions (C99+).
- Macros (`#define`).

What does NOT belong:

- Variable *definitions* (these would create the storage in every `.c` that includes the header → multiple-definition errors).
- Function bodies (same problem, unless declared `static inline`).
- Code that "does things" — headers are *declarations*, not *programs*.

## `#include "file.h"` vs `<file.h>`

- `"file.h"` — search the current directory first, then the system path. For project headers.
- `<file.h>` — search the system include path only. For standard library headers (`<stdio.h>`, `<string.h>`).

Mixing them up still usually works thanks to GCC/Clang's lenient search, but the convention matters: it signals to a reader "is this our code or the library's?"

## Modern note

- Modern projects often have a top-level `include/` directory and pass `-Iinclude` to the compiler. Headers reference each other with project-relative paths (`#include "foo/bar.h"`).
- For libraries, prefer "self-contained" headers — each header should compile on its own without depending on the consumer to include something first. Make this an explicit test in CI.
- `#pragma once` is universally supported; the guards-vs-pragma debate is mostly settled in favour of `#pragma once` for new code.

## Try it

1. Build the calculator above with a real two-file split. Try removing the include guard and `#include "calc.h"` twice — observe the duplicate-definition errors.
2. Forward-declare a struct in a header (`struct Point;`) without including its full definition. Use only the pointer in function prototypes. This is how you keep header dependencies minimal.
3. Convert one of your header's prototypes to `static inline` and move the body into the header. Notice how it now compiles independently per `.c` file but doesn't violate ODR.

## Notes from the author

- Headers are C's biggest tax on cognitive load. Modern languages (Go, Rust, Swift) ship with module systems that obviate them entirely. C23 finally proposes `#embed` and `__has_include`, but a real module system is still in proposal stage.
- Avoid "kitchen-sink" headers that re-export everything. They couple modules unnecessarily and slow compilation. Each header should expose only what *its* module needs callers to know.
- The fastest way to make a C codebase compile faster is to reduce header includes. Use forward declarations of structs whenever you can (pointer-only usage doesn't need the full type).

*Click **next →** for `static` variables.*
