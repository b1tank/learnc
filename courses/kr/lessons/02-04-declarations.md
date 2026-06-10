---
id: 02-04-declarations
chapter: 2
label: "2.4"
title: Declarations
prev: 02-03-constants
next: 02-05-arithmetic-operators
status: done
---

A declaration tells the compiler a variable's **name** and **type** so it can reserve storage and type-check every use. In C, you must declare before you use - the compiler is a single forward pass and won't guess. A declaration may also *initialize* (`int x = 0;`), list several names of one type (`int a, b, c;`), and apply qualifiers like `const` that constrain how the storage may be used.

## Declare, group, initialize, protect

```c:run declarations in one place
#include <stdio.h>

int main(void) {
    int lower = 0, upper = 100, step = 10;   /* one type, three initialized names */
    const double PI = 3.14159;               /* const: writing PI later is a compile error */
    char esc = '\\';                         /* a char constant is just a small int */
    printf("range %d..%d by %d\n", lower, upper, step);
    printf("PI=%.5f  esc-as-int=%d\n", PI, esc);
    return 0;
}
```

```output
range 0..100 by 10
PI=3.14159  esc-as-int=92
```

`const` doesn't create a new kind of storage - it's a promise to the compiler that *you* won't modify this object, letting it reject mistakes and place truly-constant data in read-only memory. `esc` printed as `92` shows again that a `char` is an integer (`'\\'` is byte 92).

## Initialized vs uninitialized

Where a variable lives decides its initial value. A **local** (automatic) variable with no initializer holds *garbage* - whatever bytes were on the stack - so always initialize locals. A **global** or `static` variable with no initializer is guaranteed **zero** by the loader (it lives in `.bss`). Initialization of a local is really a hidden assignment executed each time the block is entered; initialization of a global happens once, at load time, before `main` runs.

## Declaration vs definition

A *definition* allocates storage; a *declaration* merely announces that something exists elsewhere. For a plain `int x;` the two coincide. But `extern int x;` is a declaration with no storage - it says "`x` is defined in another file, trust me" - the mechanism that lets multiple `.c` files share one variable after the linker resolves the name. We'll use this in [External Variables](lesson.html?id=04-03-external-variables).

## Go deeper
- [Declarations (C)](https://en.cppreference.com/w/c/language/declarations) - the general grammar
- [`const` type qualifier](https://en.cppreference.com/w/c/language/const) - read-only objects and pointers
- [`extern` & linkage](https://en.cppreference.com/w/c/language/storage_duration) - sharing one object across files
- [Default initialization](https://en.cppreference.com/w/c/language/initialization) - zero for statics, garbage for locals
