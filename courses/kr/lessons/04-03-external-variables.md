---
id: 04-03-external-variables
chapter: 4
label: "4.3"
title: External Variables
prev: ex-4-2
next: ex-4-3
status: done
---

An **external variable** is defined outside any function, so it exists for the program's entire lifetime and is visible to every function that follows its definition in the file. Unlike automatic variables (born and destroyed with each function call on the [stack](https://en.wikipedia.org/wiki/Call_stack)), externals live at a fixed address in the program's `.data`/`.bss` [data segment](https://en.wikipedia.org/wiki/Data_segment). They're C's mechanism for state that several functions must share without passing it through every argument list.

## Shared state without passing it around

```c:run an external variable shared by functions
#include <stdio.h>

int errors = 0;                 /* external: one object, visible to all below */

void check(int ok) { if (!ok) errors++; }   /* mutates the shared counter */

int main(void) {
    check(1); check(0); check(0); check(1);
    printf("errors recorded: %d\n", errors);
    return 0;
}
```

```output
errors recorded: 2
```

`errors` isn't a parameter of `check`, yet `check` reads and writes it directly because it's external - a single object both functions name. This is convenient for genuinely program-wide state (an error count, a configuration flag, a lookup table). The cost is **coupling**: any function can change `errors`, so a bug anywhere can corrupt it, and the functions are no longer independently testable. Prefer parameters and return values; reserve externals for state that truly spans the whole program.

## Definition vs declaration across files

A real program spans many `.c` files. An external variable is **defined** in exactly one file (`int errors = 0;` - this allocates the storage). Every *other* file that wants to use it **declares** it with `extern int errors;` - a promise that the object exists elsewhere, with no new storage. The compiler trusts the `extern` declaration; the **linker** later resolves the name to the one real definition. Get this wrong and you see the two classic link errors: *"undefined reference"* (you declared but never defined it) or *"multiple definition"* (you defined it in more than one file). Put the `extern` declaration in a shared header so every file agrees on the type - exactly what [header files](lesson.html?id=04-05-header-files) are for.

## Go deeper
- [Storage duration & linkage (C)](https://en.cppreference.com/w/c/language/storage_duration) - `extern`, internal vs external linkage
- [Data segment / `.bss`](https://en.wikipedia.org/wiki/Data_segment) - where externals live
- [The linker](https://en.wikipedia.org/wiki/Linker_(computing)) - how `extern` names get resolved
- [Global variables: pros & cons](https://en.wikipedia.org/wiki/Global_variable) - why to use them sparingly
