---
id: 04-06-static-variables
chapter: 4
label: "4.6"
title: Static Variables
prev: 04-05-header-files
next: ex-4-11
status: done
---

The keyword `static` does two completely different things depending on where it's used. Both are about **limiting visibility or extending lifetime**.

## `static` at file scope — internal linkage

A variable or function declared `static` at file scope is *invisible to other translation units*. Each `.c` file may have its own private `static int counter` without colliding at link time.

```c
/* file scope, internal linkage — invisible to other .c files */
static int next_id = 0;

int allocate_id(void) {
    return ++next_id;
}
```

If two `.c` files each define `static int counter = 0;`, they are two *different* counters. Without `static`, the linker would complain about duplicate definitions.

For functions, `static` does the same thing: a `static` function can only be called from within its own `.c` file. It's the C equivalent of "private". Modern style: make every helper function `static` by default; only drop the keyword for functions exposed via headers.

## `static` at block scope — persistent storage

A variable declared `static` inside a function has the *scope of a local variable* (visible only inside the function) but the *lifetime of a global* (kept alive across calls).

```c:starter
#include <stdio.h>

int next_id(void) {
    static int counter = 0;   /* initialised once, persists across calls */
    return ++counter;
}

int main(void) {
    printf("id = %d\n", next_id());
    printf("id = %d\n", next_id());
    printf("id = %d\n", next_id());
    return 0;
}
```

```output
id = 1
id = 2
id = 3
```

The initialiser `= 0` runs **once**, before main is entered. Subsequent calls find `counter` holding whatever it was last set to.

Use cases:

- One-time setup that should be lazy (build a lookup table on first call).
- Caching a result computed at high cost.
- Producing a counter or unique-ID without polluting global scope.

## What about `extern` and `static` together?

They're contradictory: `extern` says "this name resolves to another translation unit", `static` says "this name is invisible to other translation units". You can't have both. The compiler will reject the combination.

## Quick reference

| Where               | `static` meaning                          | Storage           | Linkage   |
|---------------------|--------------------------------------------|-------------------|-----------|
| File scope variable | "private to this .c file"                  | Static (lifetime) | Internal  |
| File scope function | "private to this .c file"                  | n/a               | Internal  |
| Block scope variable| "persistent across calls"                  | Static (lifetime) | None      |
| Function parameter  | Not allowed (compile error)                | —                 | —         |

## Modern note

- **`static const` arrays** are a C idiom for read-only lookup tables. Declare them once at file scope, the compiler places them in `.rodata`, and the cost is zero per access.
- **Thread safety**: a `static` block-scope variable is *shared between all threads* calling the function. For a counter you want per-thread, use `_Thread_local` (C11) or `__thread` (GCC).
- **Re-initialisation**: a `static` variable initialised with `= 0` (the most common case) lives in the BSS segment and gets zeroed by the OS at startup — there's literally no runtime initialisation cost.

## Try it

1. Write a `next_pow2(int x)` that caches its argument and result in `static` variables so a repeated call with the same `x` returns instantly.
2. Define `static int helper(...)` in a `.c` file and try to call it from another. Read the linker error.
3. Write a function with a `static` 256-entry lookup table built on first call (guarded by a `static int initialised`). On the second call, the table is already built — skip the initialisation.

## Notes from the author

- "Private functions" is one of the most important conventions in any C codebase. `static` is C's only access modifier — use it liberally.
- The `static` block-scope variable is the closest C gets to a closure. Don't abuse it for state that should belong to a struct; one `static int initialised` flag is fine, but a constellation of `static` locals across many calls quickly becomes spaghetti.
- A function with `static` locals is *not thread-safe by default*. If your program ever grows threads, you'll need to revisit every one. Production C code typically avoids `static` locals in any function that might be called from multiple threads.

*Click **next →** for `register` variables (and why they're mostly obsolete).*
