---
id: 06-07-typedef
chapter: 6
label: "6.7"
title: 'Typedef'
prev: ex-6-6
next: 06-08-unions
status: done
---

`typedef` creates a **new name for an existing type**. It introduces no new type and generates no code - it's purely an alias the compiler substitutes at compile time. Its two big uses are readability (giving a clean name to a verbose or ugly type, especially `struct`s and function pointers) and portability (defining a type alias you can change in one place). The standard library leans on it constantly: `size_t`, `FILE`, `time_t`, and the fixed-width `int32_t`/`uint8_t` are all `typedef`s.

## Naming structs and builtins

```c:run a typedef'd struct drops the 'struct' keyword
#include <stdio.h>

typedef struct { int x, y; } Point;   /* Point is now a type name */
typedef int Length;                   /* an alias for a builtin */

int main(void) {
    Point  p  = { 3, 4 };             /* no 'struct' needed */
    Length d2 = p.x * p.x + p.y * p.y;
    printf("p=(%d,%d) dist^2=%d\n", p.x, p.y, d2);
    return 0;
}
```

```output
p=(3,4) dist^2=25
```

`typedef struct { int x, y; } Point;` defines an anonymous struct *and* names it `Point` in one stroke, so you can write `Point p` instead of `struct point p` everywhere after. This is the most common C idiom for structs - it removes the repetitive `struct` keyword and makes declarations read like other languages' types. `typedef int Length;` shows the simpler form: `Length` is just another spelling of `int`, but the name documents *intent* (this number is a length, not an arbitrary int). Note `Length` doesn't create a *distinct* type - the compiler still treats it as `int`, so it won't stop you mixing a `Length` with a plain `int`; the benefit is purely documentation and one-place-to-change.

## Portability, function pointers, and a caution

`typedef`'s portability payoff is real: define `typedef long MyInt;` once, and switching every `MyInt` in the program to `long long` is a one-line edit. This is exactly how `<stdint.h>` works - `int32_t` is a `typedef` that each platform maps to whatever native type is 32 bits wide, so your code says what it *means* (a 32-bit integer) and stays correct everywhere. `typedef` also tames the [complicated declarations](lesson.html?id=05-12-complicated-declarations) from earlier: `typedef int (*BinOp)(int, int);` names "pointer to a function taking two ints, returning int," turning unreadable declarations into `BinOp op = add;`. One stylistic caution: don't `typedef` away pointer-ness (e.g. `typedef struct node *NodeP;`) carelessly - hiding the `*` makes `const`-qualification and the fact that you're passing a pointer non-obvious to readers, which is why many style guides (notably the Linux kernel's) restrict `typedef` to opaque handles and genuinely complex types. Used judiciously, though, it's one of C's best readability tools.

## Go deeper
- [`typedef` (C)](https://en.cppreference.com/w/c/language/typedef) - semantics and forms
- [`<stdint.h>` fixed-width types](https://en.cppreference.com/w/c/types/integer) - portability via typedef
- [`size_t`, `time_t`, `FILE`](https://en.cppreference.com/w/c/types) - standard typedefs
- [Linux kernel typedef policy](https://www.kernel.org/doc/html/latest/process/coding-style.html#typedefs) - when *not* to use it
