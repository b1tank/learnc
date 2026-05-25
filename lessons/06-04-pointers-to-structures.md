---
id: 06-04-pointers-to-structures
chapter: 6
label: "6.4"
title: 'Pointers to Structures'
prev: 06-03-arrays-of-structures
next: 06-05-self-referential-structures
status: done
---

A pointer to a struct works just like a pointer to anything else:

```c
struct point pt = {3, 4};
struct point *p = &pt;
```

Access members through the pointer with `->`:

```c
p->x       /* equivalent to (*p).x */
p->y       /* equivalent to (*p).y */
```

The `->` operator was added to C for ergonomics. `(*p).x` works but is hard to read.

## Why pointers to structs matter

1. **Cheap function arguments** — pass a pointer (one register) instead of the whole struct.
2. **Mutation** — the function can modify the caller's struct.
3. **Dynamic data structures** — linked lists, trees, graphs all hold pointers to other nodes.
4. **Polymorphic data** — when you want a "handle" without exposing fields.

## Modifying through a pointer

```c:starter
#include <stdio.h>

struct point {
    int x;
    int y;
};

void normalize(struct point *p) {
    if (p->x < 0) p->x = -p->x;
    if (p->y < 0) p->y = -p->y;
}

int main(void) {
    struct point a = {-3, 4};
    printf("before: (%d, %d)\n", a.x, a.y);
    normalize(&a);
    printf("after:  (%d, %d)\n", a.x, a.y);
    return 0;
}
```

```output
before: (-3, 4)
after:  (3, 4)
```

## Walking an array of structs via pointer

```c
struct key *p;
for (p = keytab; p < keytab + NKEYS; ++p)
    if (p->count > 0)
        printf("%4d %s\n", p->count, p->word);
```

`p++` advances by **one whole struct** (the compiler scales the increment by `sizeof(*p)`). This pointer-walk is equivalent to indexing with `keytab[i]`.

## Operator precedence quirks

`->` and `.` bind very tightly. `++p->count` is `++(p->count)` — it increments the `count` member, not the pointer. To increment the pointer, write `(++p)->count` or just `++p; p->count`.

## Try it

1. Write a function `nearest_to_origin(struct point *pts, int n)` that returns a pointer to the point closest to (0,0).
2. Try `p++->count++` and read it aloud — that's three operations on three different things.

## Notes from the author

- The "pass a pointer for mutation" convention spreads across C APIs: `fread(buf, sz, n, fp)` writes into your buffer; `strtol(s, &endp, 10)` writes the end position. Output parameters are pointer arguments.
- `const struct T *p` says "I take a pointer but won't modify". Use it consistently — the documentation is enforced by the compiler.
- Pointer arithmetic on struct arrays is a real C idiom. The compiler does the multiplication-by-sizeof for you. Once you internalise it, walking arrays without indices becomes natural.

*Click **next →** for self-referential structures.*
