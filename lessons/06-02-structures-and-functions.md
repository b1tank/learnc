---
id: 06-02-structures-and-functions
chapter: 6
label: "6.2"
title: 'Structures and Functions'
prev: 06-01-basics-of-structures
next: 06-03-arrays-of-structures
status: done
---

Structures can be passed to functions and returned from them. The semantics are **by value**: the entire struct is copied into the parameter, and a copy is returned.

```c:starter
#include <stdio.h>

struct point {
    int x;
    int y;
};

/* construct a point */
struct point makepoint(int x, int y) {
    struct point p;
    p.x = x;
    p.y = y;
    return p;
}

/* add two points */
struct point addpoint(struct point a, struct point b) {
    a.x += b.x;
    a.y += b.y;
    return a;
}

int main(void) {
    struct point a = makepoint(3, 4);
    struct point b = makepoint(1, 2);
    struct point c = addpoint(a, b);
    printf("a + b = (%d, %d)\n", c.x, c.y);
    return 0;
}
```

```output
a + b = (4, 6)
```

## By value, by pointer

For a small struct (say, two `int`s), pass-by-value is fine — the copy is cheap. For larger structs, pass a pointer:

```c
void shift(struct point *p, int dx, int dy) {
    p->x += dx;       /* p->x is shorthand for (*p).x */
    p->y += dy;
}

shift(&a, 1, 1);     /* modifies a in place */
```

The `->` operator dereferences a pointer and accesses a member in one step. `p->x` ≡ `(*p).x`.

## When to choose which

| Need                                | Pattern                       |
|--------------------------------------|-------------------------------|
| Return a new value                   | Return a struct (by value)    |
| Modify caller's struct               | Take `struct T *`             |
| Avoid copying large struct           | Take `const struct T *`        |
| Lots of accesses inside the function | Take pointer, use `->`        |

In modern C, the convention for "do not modify" is `const struct T *`. The `const` documents intent and lets the compiler catch accidental mutations.

## Returning aggregate vs. modifying

Both styles are idiomatic. Compare:

```c
struct point translated = translate(p, 3, 4);  /* functional style */
translate_in_place(&p, 3, 4);                   /* imperative style */
```

The functional style chains nicely. The imperative style avoids copying. ABI-wise, small structs (≤16 bytes on x86-64) are often returned in registers, so the copy is free.

## Try it

1. Write `subpoint`, `scalepoint(p, k)`, and `manhattan(a, b)` (the L1 distance).
2. Convert `addpoint` to take pointer arguments. When is each version better?

## Notes from the author

- "Pass-by-value for structs" is a unique-to-C-and-its-descendants design. Many languages pass everything by reference (Java) or by sharing (Python). C's value semantics give you predictable copy costs.
- The `->` operator is one of the most-asked-about quirks of C. It exists because the precedence of `.` and `*` would otherwise force parens (`(*p).x`). The shorthand is the *only* reason `->` is in the language.
- Returning a struct used to be expensive on early machines. Today, small structs return in registers; it's free. Don't optimise prematurely by switching to out-parameters.

*Click **next →** for arrays of structs.*
