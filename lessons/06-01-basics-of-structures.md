---
id: 06-01-basics-of-structures
chapter: 6
label: "6.1"
title: 'Basics of Structures'
prev: ex-5-20
next: 06-02-structures-and-functions
status: done
---

A **structure** groups several variables — possibly of different types — into a single named object, laid out as one contiguous block in memory. Where an array is a row of *identical* elements indexed by number, a struct is a bundle of *named* members accessed by the `.` operator. This is how C models real-world records: a point has an `x` and a `y`, a date has a day/month/year, an employee has a name and a salary. The struct is the foundation for every aggregate data type and, ultimately, for how the kernel and libraries describe complex objects to your program.

## Defining and using a struct

```c:run members, nesting, and dot access
#include <stdio.h>

struct point { int x, y; };               /* a type: two ints, named */
struct rect  { struct point lo, hi; };    /* structs nest inside structs */

int main(void) {
    struct point p = { 3, 4 };            /* initialize members in order */
    struct rect  r = { {0, 0}, {10, 5} };
    printf("p = (%d, %d)\n", p.x, p.y);
    printf("rect area = %d\n", (r.hi.x - r.lo.x) * (r.hi.y - r.lo.y));
    printf("sizeof(struct point) = %zu\n", sizeof(struct point));
    return 0;
}
```

```output
p = (3, 4)
rect area = 50
sizeof(struct point) = 8
```

`struct point { int x, y; };` declares a *type*, not a variable — it's a template. `struct point p = {3, 4};` then creates an actual object and initializes `x` to 3, `y` to 4 in declaration order. Members are reached with `.`: `p.x`, `r.hi.y`. Structs nest naturally — a `rect` contains two `point`s — and `.` chains: `r.hi.x` means "the `x` of the `hi` of `r`." `sizeof(struct point)` is 8 here: two 4-byte ints laid side by side, with no gaps needed.

## Memory layout and padding

A struct's members are stored *in order*, but the compiler may insert invisible **padding** bytes between them so each member lands on its natural [alignment](https://en.wikipedia.org/wiki/Data_structure_alignment) boundary — most CPUs read a 4-byte `int` fastest when its address is a multiple of 4, and some fault on misaligned access. So `struct { char c; int n; }` is usually **8** bytes, not 5: three padding bytes sit after `c` to align `n`. That's why you should never assume `sizeof(struct)` equals the sum of its members, and why reordering members from largest to smallest can shrink a struct. Two consequences worth remembering: the *first* member always sits at offset 0 (so a pointer to the struct is also a pointer to its first member), and you can't portably compare two structs with `==` — you must compare member by member, because the padding bytes hold indeterminate garbage. The exact layout (offsets, total size) is fixed by the platform's [ABI](https://en.wikipedia.org/wiki/Application_binary_interface), which is what lets your code and the operating system agree on the shape of shared structures.

## Go deeper
- [Structures (C)](https://en.cppreference.com/w/c/language/struct) — declaration, members, initialization
- [Data structure alignment & padding](https://en.wikipedia.org/wiki/Data_structure_alignment) — why `sizeof` surprises you
- [`offsetof`](https://en.cppreference.com/w/c/types/offsetof) — query a member's byte offset
- [Application binary interface](https://en.wikipedia.org/wiki/Application_binary_interface) — who decides the layout
