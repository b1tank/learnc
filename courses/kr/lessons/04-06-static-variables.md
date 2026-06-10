---
id: 04-06-static-variables
chapter: 4
label: "4.6"
title: Static Variables
prev: 04-05-header-files
next: ex-4-11
status: done
---

The keyword `static` does two unrelated jobs depending on *where* it appears, and conflating them causes endless confusion. Inside a function, `static` changes a variable's **storage duration**: instead of living on the stack and dying each call, the variable lives in the `.data`/`.bss` segment for the whole program and **retains its value between calls**. At file scope, `static` instead changes **linkage**: it makes a function or variable **private to its `.c` file**, invisible to the linker and to other files. One keyword, two meanings - but both are about restricting and persisting.

## Persistent memory inside a function

```c:run static persists between calls
#include <stdio.h>

int counter(void) {
    static int calls = 0;       /* initialized ONCE; survives every call */
    return ++calls;
}

int main(void) {
    int a = counter();
    int b = counter();
    int c = counter();
    printf("%d %d %d\n", a, b, c);
    return 0;
}
```

```output
1 2 3
```

`calls` is initialized to 0 exactly once, at program load - not on every call. Each call increments the *same* object, so it climbs 1, 2, 3. Remove `static` and `calls` would be a fresh stack variable reset to 0 every time, forever returning 1. This is how a function keeps private state across calls: counters, caches, lazy "have I initialized yet?" flags, and pseudo-random generators all rely on it. The trade-off: a function with `static` state is no longer *pure* - it returns different results for the same arguments and isn't safe to call from multiple threads without locking.

## File-scope `static`: the privacy modifier

At file scope, `static int table[100];` or `static void helper(void) { ... }` gives the variable/function **internal linkage** - it exists only within that one `.c` file. Another file can define its own `helper` with no clash, and nothing outside can reach yours. This is C's main tool for *encapsulation*: expose a few functions through the header (external linkage) and hide all the implementation helpers with `static`. It keeps the global namespace clean and signals "this is an internal detail, don't depend on it." So: `static` inside a function = *remembers*; `static` on a global = *hidden*.

## Go deeper
- [`static` storage duration (C)](https://en.cppreference.com/w/c/language/storage_duration) - both meanings explained
- [Internal vs external linkage](https://en.cppreference.com/w/c/language/storage_duration#Linkage) - file-scope `static`
- [Pure functions](https://en.wikipedia.org/wiki/Pure_function) - what `static` state breaks
- [`.bss` segment](https://en.wikipedia.org/wiki/.bss) - where zero-initialized statics live
