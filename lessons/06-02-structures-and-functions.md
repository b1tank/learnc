---
id: 06-02-structures-and-functions
chapter: 6
label: "6.2"
title: 'Structures and Functions'
prev: 06-01-basics-of-structures
next: 06-03-arrays-of-structures
status: done
---

Unlike arrays, a whole **structure is a first-class value** in C: you can assign one struct to another (`a = b` copies every member), pass a struct *by value* to a function (the callee gets its own copy), and *return* a struct from a function. This makes structs convenient — a function can hand back a coordinate, a complex number, or a small record as a single value. But "by value" means exactly that: the function works on a copy, so changes inside it don't touch the caller's original unless you deliberately pass a pointer.

## Pass and return by value

```c:run structs copy on assignment, argument, and return
#include <stdio.h>

struct point { int x, y; };

struct point makepoint(int x, int y) {
    struct point p = { x, y };
    return p;                       /* the struct value is copied back */
}

struct point addpoint(struct point a, struct point b) {
    a.x += b.x;                     /* a is a COPY of the caller's struct */
    a.y += b.y;
    return a;                       /* caller's originals are untouched */
}

int main(void) {
    struct point a = makepoint(2, 3);
    struct point b = makepoint(5, 1);
    struct point c = addpoint(a, b);
    printf("a=(%d,%d) after add: a still (%d,%d)\n", c.x, c.y, a.x, a.y);
    return 0;
}
```

```output
a=(7,4) after add: a still (2,3)
```

`addpoint` modifies `a.x` and `a.y`, yet after the call `main`'s `a` is *still* `(2, 3)` — because the function received a **copy**. The modified copy comes back only through the `return` value, which we captured in `c`. This value semantics is clean and safe (no aliasing surprises), and it's why `makepoint` can simply build a local struct and return it. Assigning `c = addpoint(...)` is itself a struct copy: every member is duplicated.

## When to pass a pointer instead

By-value structs are copied in full on every call and return. For a tiny `struct point` (8 bytes) that's free, but for a large struct — say one with arrays or many members — copying it can be wasteful, and there's no way to *modify* the caller's struct through a value parameter. The fix is to pass a **pointer to the struct** (next section's `->` operator): `void addto(struct point *p, struct point d)` lets the function change `*p` in place and copies only an address (4–8 bytes) instead of the whole object. The rule of thumb mirrors other languages' "pass big things by reference": pass small, read-only structs by value for clarity; pass large structs, or any struct you need to *modify*, by pointer (adding `const` when you only read). Under the hood, the calling convention decides how a struct argument travels — small ones may ride in CPU registers, larger ones are copied onto the stack — but you rarely need to think about that; you choose value vs pointer based on size and whether you need to mutate the original.

## Go deeper
- [Struct as a value (C)](https://en.cppreference.com/w/c/language/struct) — assignment and copying
- [Function arguments & return](https://en.cppreference.com/w/c/language/functions) — by-value semantics
- [`const` pointer parameters](https://en.cppreference.com/w/c/language/const) — read-only by reference
- [Calling conventions](https://en.wikipedia.org/wiki/Calling_convention) — how structs are actually passed
