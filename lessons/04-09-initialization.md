---
id: 04-09-initialization
chapter: 4
label: "4.9"
title: Initialization
prev: 04-08-block-structure
next: 04-10-recursion
status: done
---

C has surprisingly nuanced rules about what variables hold *before* you first assign to them. The summary:

| Storage class                       | Default initial value (no `= ...`) |
|-------------------------------------|------------------------------------|
| External (file scope) variable      | Zero / NULL / 0.0                  |
| `static` block-scope variable        | Zero / NULL / 0.0                  |
| Automatic (function local)           | **Indeterminate (garbage)**        |
| `register`                          | Indeterminate                      |

Static-storage variables are zero-initialised because the OS gives the program a zeroed `.bss` page. Automatic variables live on the stack, which is reused frame by frame — whatever bytes were there before are still there.

## The bug

```c
#include <stdio.h>

int main(void) {
    int sum;                   /* uninitialised, holds garbage */
    for (int i = 1; i <= 10; ++i)
        sum += i;              /* adding to garbage produces garbage */
    printf("sum = %d\n", sum); /* prints whatever was on the stack */
    return 0;
}
```

This is one of the most common C bugs. Fix: always initialise:

```c:starter
#include <stdio.h>

int main(void) {
    int sum = 0;               /* explicit; no garbage */
    for (int i = 1; i <= 10; ++i)
        sum += i;
    printf("sum = %d\n", sum);
    return 0;
}
```

```output
sum = 55
```

Modern compilers warn about reads of uninitialised variables with `-Wall` (and aggressively so under `-Wuninitialized`). Even better, build with the **MemorySanitizer** (`-fsanitize=memory` in Clang) and it instruments every read so the program *aborts* the instant you read an uninitialised byte.

## Array and struct initialisation

For arrays, the syntax is brace-enclosed lists:

```c
int v[5] = { 1, 2, 3, 4, 5 };
int w[10] = { 0 };          /* first element 0, rest zero-filled */
int z[] = { 1, 2, 3 };      /* size deduced as 3 */
char s[] = "hello";         /* equivalent to { 'h','e','l','l','o','\0' } */
```

The rule: if the initialiser has fewer elements than the array, the rest are zero-initialised. So `int a[1000] = {0};` is a fast, clean zero-fill of a thousand integers.

For structs:

```c
struct point { int x, y; };
struct point p = { 3, 4 };          /* x=3, y=4 */
struct point q = { .x = 5 };        /* designated init (C99); y defaults to 0 */
```

C99's **designated initialisers** (the `.x = 5` form) are a quiet revolution — they let you initialise by *name* instead of position. Reorder fields without breaking initialisers, skip fields you don't need (defaults kick in), and the code self-documents.

## A subtlety: static vs auto with the same code

```c
void f(void) {
    int a = 0;             /* runs every call: stack slot becomes 0 */
    static int b = 0;      /* runs once before main(): b becomes 0 */
}
```

The visible effect is the same on the first call. But `static int b = 0;` initialises **once**; the `= 0` is only there for the start. Subsequent calls inherit whatever value `b` ended up with.

This explains why some people write `static int c;` (no initialiser) for static counters — they know it's automatically zero. Working code, but `= 0` documents intent better.

## Modern note

- C23 adds `auto` as a type-inference keyword and `nullptr` as a typed null. Initialisation styles haven't otherwise changed.
- `memset(arr, 0, sizeof arr);` is the runtime equivalent of `int arr[N] = {0};`. Either works; the compile-time form is faster (no function call) for small arrays.
- For complex structs with many nested fields, designated initialisers eliminate the "wait, which field am I setting?" cognitive load. Adopt the C99 style universally.

## Try it

1. Compile the buggy `sum` example with `-Wall -Wuninitialized`. Read the warning.
2. Add a `struct rect { struct point top_left, bottom_right; };` and initialise it both with positional and designated syntax. Notice how positional is brittle to field reorders.
3. Try `int big[10000] = {0};` and inspect the binary's `.bss` size with `size a.out`. The OS pre-zeroes it for free.

## Notes from the author

- The "uninitialised local" bug remains the single most common C UB. Auto-initialisation to zero would catch most of these — Rust does this — but C historically punted to the programmer for the speed gain. Use the sanitisers; they make this bug visible.
- Designated initialisers are one of C99's biggest wins for readability. Use them whenever you have a struct with more than two fields. They make patches reviewable (each field's intent is in the diff).
- The "fewer initialisers → rest are zero" rule is occasionally surprising for arrays. `int v[5] = { 1 };` gives `{ 1, 0, 0, 0, 0 }`, not `{ 1 }` with the rest uninitialised. This is intentional and useful.

*Click **next →** for recursion.*
