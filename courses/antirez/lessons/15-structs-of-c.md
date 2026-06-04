---
id: 15-structs-of-c
chapter: 6
label: "6.3"
title: The structs of C
prev: 14-hidden-metadata-behind-pointer
next: 16-structs-as-data-structure-bricks
status: draft
source:
  videoId: p4IMHau2lq8
  url: https://www.youtube.com/watch?v=p4IMHau2lq8
---

> **Source video.** [Impariamo il C — lezione 14: le strutture del C](https://www.youtube.com/watch?v=p4IMHau2lq8) by Salvatore Sanfilippo.

## TL;DR

A `struct` glues several named fields under one type, so instead of juggling `f[0]`, `f[1]` you write `f->num`, `f->den`. Reach the fields with `.` on a value and `->` through a pointer — the two operators exist only so the reader can see at a glance which kind of variable they have. The struct itself is laid out with **padding** so every field sits at an address that is a multiple of its size.

## Walkthrough

### From parallel arrays to a named type `[02:20 → 15:32]`

The motivating example is a fraction. You *can* `malloc(sizeof(int) * 2)` and agree that slot 0 is the numerator and slot 1 the denominator — and then write `set_fraction`, `print_fraction`, `simplify_fraction` that all index `f[0]` and `f[1]`. It works, but every reader has to remember the convention, and adding a third field (say, a sign byte) means renumbering everything. `struct fract { int num; int den; };` gives the convention a name the compiler can check.

### `.` vs `->` — same operation, two spellings `[23:08 → 27:11]`

Given `struct fract a;` you write `a.num`. Given `struct fract *b = &a;` you write `b->num`, which is just sugar for `(*b).num`. C does not let you use `.` on a pointer or `->` on a value — the redundancy is deliberate: when you see `->` you know without scrolling that the left-hand side is a pointer.

### A first struct, by value `[22:21]`

```c:run struct-by-value
#include <stdio.h>

struct point { int x, y; };

int main(void) {
    struct point p;
    p.x = 3;
    p.y = 4;
    printf("(%d, %d)\n", p.x, p.y);
    printf("sizeof(struct point) = %zu\n", sizeof(struct point));
    return 0;
}
```

```output
(3, 4)
sizeof(struct point) = 8
```

### Through a pointer, with `->` `[27:40 → 29:23]`

A function that mutates the struct takes a `struct point *` and uses the arrow. This is the idiomatic shape — passing structs by pointer avoids the implicit byte-by-byte copy you get when returning them by value.

```c:run struct-by-pointer
#include <stdio.h>

struct point { int x, y; };

void shift(struct point *p, int dx, int dy) {
    p->x += dx;
    p->y += dy;
}

int main(void) {
    struct point p = {1, 2};
    shift(&p, 10, 20);
    printf("(%d, %d)\n", p.x, p.y);
    return 0;
}
```

```output
(11, 22)
```

### Padding and alignment `[17:06 → 22:13]`

`sizeof(struct point)` above is 8, exactly what you expect: two 4-byte `int`s. Now insert an `unsigned char color` before them and the size jumps to **12**, not 9 — the compiler inserts three bytes of *padding* so `x` lands at an address that is a multiple of 4. Move the `char` to the end and the size is *still* 12: the struct as a whole is padded up to a multiple of its widest field, so arrays of it stay aligned. You can ask for a `__attribute__((packed))` struct without padding, but it is rarely worth it.

## Modern note

Two ergonomic touches the lesson does not show:

- **Designated initializers** let you name the fields you set, in any order, with the rest zeroed: `struct point p = { .x = 1, .y = 2 };`. Add a new field later and old initializers still compile.
- **Compound literals** build an anonymous struct value in an expression, useful for passing one to a function: `shift(&(struct point){0, 0}, 5, 5);` (the temporary lives until the end of the enclosing block).

Both are standard since C99.

## Under the hood (asm)

A struct is a name for an offset table — the compiler resolves field names at compile time. For `struct Point { int x; int y; int z; }`:

```asm
get_y:                         ; int get_y(struct Point *p) { return p->y; }
        endbr64
        mov     eax, DWORD PTR [rdi+4]   ; offset 4 = where y lives
        ret
sum:                           ; return p->x + p->y + p->z
        endbr64
        mov     eax, DWORD PTR [rdi+4]
        add     eax, DWORD PTR [rdi]
        add     eax, DWORD PTR [rdi+8]
        ret
```

`p->y` is literally `[base + 4]` — there is no "field lookup" at runtime; the offset was burned into the instruction stream. Reorder the fields and the offsets change. This is why adding a field to a struct in a shared header is an ABI break: every compiled caller has the old offsets baked in.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for register/calling-convention details.

## Try it

1. Add `char tag;` as the first field of `struct point` and re-run — what does `sizeof` print now? Move `tag` to the end and re-check.
2. Replace `p.x = 3; p.y = 4;` with one designated initializer and confirm the output is unchanged.
3. Change `shift` to take `struct point p` by value (no pointer, no `&` at the call site) and observe that the printed point is now `(1, 2)` — the function mutated a copy.

## Cross-reference to K&R

[K&R § 6.1 — Basics of Structures](../../kr/lessons/06-01-basics-of-structures.md) covers the same ground in K&R's typically dense style, including struct assignment, structs as function arguments, and the `.` / `->` rule.

## Go deeper

- [cppreference: struct declaration](https://en.cppreference.com/w/c/language/struct) — the authoritative reference, including the rules for incomplete types and bit-fields.
- [cppreference: object alignment](https://en.cppreference.com/w/c/language/object#Alignment) and `_Alignof` / `_Alignas` — what "multiple of its size" really means once you leave the `int`-and-`char` world.
- `pahole` (Linux, part of `dwarves`) — feed it a compiled object file and it prints every struct with its padding holes drawn in.

*Click **next →** to use structs as bricks for real data structures.*
