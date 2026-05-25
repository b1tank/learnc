---
id: 06-01-basics-of-structures
chapter: 6
label: "6.1"
title: 'Basics of Structures'
prev: ex-5-20
next: 06-02-structures-and-functions
status: done
---

A **structure** in C bundles named members of (possibly different) types into one composite. The classical example is a 2-D point:

```c
struct point {
    int x;
    int y;
};
```

This declares a *type* `struct point`. It does not allocate storage; it tells the compiler "a `struct point` is two `int`s named `x` and `y`".

To create an instance:

```c
struct point pt;             /* uninitialised */
struct point origin = {0, 0}; /* member-by-member initialiser */
pt.x = 3;
pt.y = 4;
```

Access members with `.` (dot operator).

```c:starter
#include <stdio.h>

struct point {
    int x;
    int y;
};

int main(void) {
    struct point a = {3, 4};
    struct point b;
    b.x = a.x + 1;
    b.y = a.y - 1;
    printf("a = (%d, %d)\n", a.x, a.y);
    printf("b = (%d, %d)\n", b.x, b.y);
    return 0;
}
```

```output
a = (3, 4)
b = (3, 5)
```

## Naming: tags vs. types

The `point` after `struct` is a **tag**. It lets you refer to the type later as `struct point`. The tag is in its own namespace — `struct point` and a variable named `point` don't collide.

You can declare and define variables in one go:

```c
struct point { int x; int y; } pt1, pt2;
```

This declares the type `struct point` AND two variables `pt1`/`pt2`. The tag is optional if you're not going to refer to the type by name later.

## Sizes and alignment

```c
sizeof(struct point)
```

returns the storage in bytes. It may be more than the sum of member sizes due to **padding** for alignment. On most 64-bit platforms, two `int`s give `sizeof == 8` with no padding; mixing an `int` and a `double` typically pads to satisfy alignment.

## What you CAN do with a struct

- Assign one struct to another (`a = b;`) — copies all members.
- Pass to a function (passed by value — the whole struct is copied).
- Return from a function.
- Take its address (`&a`).
- Access a member (`a.x`).

## What you CANNOT do

- Compare with `==` — C doesn't define equality on structs. Compare member-by-member.
- Hash directly — same reason; no built-in operation.

## Try it

1. Add a `struct rect { struct point ll, ur; };` (lower-left and upper-right corners) and print its dimensions.
2. Check the value of `sizeof(struct point)` and explain it.

## Notes from the author

- C structs are *plain data*: no methods, no inheritance, no automatic constructors. That's a feature — the layout is exactly what you wrote. C++ added methods and access modifiers; C kept it bare.
- "Struct assignment copies all members" was added in K&R 2e. Original C couldn't even assign one struct to another — you had to copy member-by-member. Modern C makes this trivial.
- Padding rules differ by platform. The pragmatic check is `sizeof` and `offsetof` (from `<stddef.h>`); never assume.

*Click **next →** to pass structs to functions.*
