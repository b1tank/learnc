---
id: 04-05-header-files
chapter: 4
label: "4.5"
title: Header Files
prev: 04-04-scope-rules
next: 04-06-static-variables
status: done
---

A real program is split across many `.c` files compiled separately, then linked. For one file to call a function (or use a variable) defined in another, the caller's file needs the **declaration** - the prototype - at compile time. A **header file** (`.h`) is just a shared text file of declarations that multiple `.c` files `#include`. The preprocessor literally pastes the header's text in place, so every file sees the same prototypes and the compiler can type-check every call. The header is the *interface*; the `.c` file is the *implementation*.

## Interface vs implementation

In a single runnable we can't have two files, but here's the split a header enforces - declarations up top (what a `.h` holds), definitions below (what the matching `.c` holds):

```c:run interface (declarations) then implementation
/* These prototypes are what "mathx.h" would contain, #included everywhere: */
#include <stdio.h>

int add(int, int);          /* interface: just the signatures */
int mul(int, int);

int add(int a, int b) { return a + b; }   /* implementation: the bodies */
int mul(int a, int b) { return a * b; }

int main(void) {
    printf("add=%d mul=%d\n", add(2, 3), mul(2, 3));
    return 0;
}
```

```output
add=5 mul=6
```

In a multi-file project, `main.c` would `#include "mathx.h"` to get the prototypes and call `add`/`mul`, while `mathx.c` would `#include "mathx.h"` *and* define the bodies. Including the header in the implementation file too means the compiler checks the definitions against their own declarations - catching a signature you changed in one place but not the other.

## Include guards and the `<>` vs `""` rule

Because headers include other headers, the same header can get pulled in twice, redefining types and causing errors. Every header therefore wears an **include guard** so its body is processed only once per file:

```c
#ifndef MATHX_H        /* if not yet defined... */
#define MATHX_H        /* ...define the sentinel and process the body */
int add(int, int);
int mul(int, int);
#endif                 /* second inclusion: MATHX_H is set, body skipped */
```

(Most compilers also accept the simpler `#pragma once`.) The two `#include` spellings differ in *where* the preprocessor searches: `#include <stdio.h>` (angle brackets) looks in the system/standard include paths - use it for library headers; `#include "mathx.h"` (quotes) looks in your project directory first - use it for your own headers. A header should contain declarations, macros, and type definitions - **not** function bodies or variable definitions - so that including it in many files doesn't create duplicate definitions for the linker to reject.

## Go deeper
- [Header files (C)](https://en.cppreference.com/w/c/preprocessor/include) - `#include` mechanics
- [Include guard](https://en.wikipedia.org/wiki/Include_guard) - preventing double inclusion
- [`#pragma once`](https://en.wikipedia.org/wiki/Pragma_once) - the one-line alternative
- [Separate compilation & linking](https://en.wikipedia.org/wiki/Translation_unit_(programming)) - why the interface/implementation split exists
