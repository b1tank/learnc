---
id: 04-09-initialization
chapter: 4
label: "4.9"
title: Initialization
prev: 04-08-block-structure
next: 04-10-recursion
status: done
---

**Initialization** gives a variable a value at the moment it's created, and the rules differ sharply by storage class. An **automatic** (local) variable with no initializer holds *garbage* - whatever bytes were already on the stack - so reading it is undefined behavior. A **static or external** variable with no initializer is guaranteed to start as **zero**, because the loader places it in the `.bss` segment, which the OS clears before `main` runs. Knowing which category a variable falls into tells you whether you *must* initialize it yourself.

## Arrays and designated initializers

```c:run aggregate and designated initialization
#include <stdio.h>

int main(void) {
    int days[] = { 31, 28, 30, 31, 30 };   /* size inferred from the list: 5 */
    int count  = sizeof days / sizeof days[0];
    printf("days[3]=%d count=%d\n", days[3], count);

    int sparse[10] = {0};                   /* every element set to 0 */
    printf("sparse[5]=%d\n", sparse[5]);

    int desig[5] = { [2] = 99, [4] = 7 };   /* C99: name specific indices */
    printf("desig: %d %d %d %d %d\n",
           desig[0], desig[1], desig[2], desig[3], desig[4]);
    return 0;
}
```

```output
days[3]=31 count=5
sparse[5]=0
desig: 0 0 99 0 7
```

Three rules in one program. First, `int days[] = {...}` lets the compiler **count** the elements for you, so the size and the list can never disagree. Second, when you give *fewer* initializers than the array's length (`{0}` for a 10-element array), C fills the rest with **zero** - so `{0}` is the idiom for "zero the whole array." Third, **designated initializers** (C99) let you set elements by index `[2] = 99`; everything you don't name is zero-filled. The same `{ }` brace syntax initializes structs, and designators work there too (`.field = value`).

## Compile-time vs run-time, and the cost of zeroing

Where the initializer's value comes from matters. For a `static`/global variable the initializer must be a **constant expression** the compiler can evaluate at build time - it's baked straight into the program image, so there's no run-time cost. For an automatic variable the initializer can be *any* expression (a function call, another variable), and it executes as an assignment **each time the block is entered**. That's why `int n = compute();` inside a loop body re-runs `compute()` every iteration. One more under-the-hood note: zero-initialized statics cost *nothing* on disk (they live in `.bss`, which is just a size, not stored bytes), whereas a large array of nonzero constants is stored literally in the `.data` segment and bloats the executable. Prefer initializing at the point of declaration - it removes the "did I forget to set this?" class of bug entirely.

## Go deeper
- [Initialization (C)](https://en.cppreference.com/w/c/language/initialization) - the full rule set
- [Designated initializers](https://en.cppreference.com/w/c/language/array_initialization#Designated_initializers) - `[index] =` and `.field =`
- [`.bss` vs `.data`](https://en.wikipedia.org/wiki/.bss) - why zeroing is free
- [Undefined behavior](https://en.cppreference.com/w/c/language/behavior) - what reading an uninitialized local invites
