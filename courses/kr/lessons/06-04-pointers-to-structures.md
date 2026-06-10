---
id: 06-04-pointers-to-structures
chapter: 6
label: "6.4"
title: 'Pointers to Structures'
prev: ex-6-1
next: 06-05-self-referential-structures
status: done
---

Because copying a whole struct can be costly and value parameters can't modify the caller's data, C code overwhelmingly works with **pointers to structures**. A pointer to a struct is just an address, so passing it is cheap and lets a function change the original in place. Accessing a member through a pointer is so common that C gives it dedicated syntax: `p->member`, the **arrow operator**, which means "follow the pointer, then take the member" - shorthand for the clumsy `(*p).member`.

## The arrow operator

```c:run p->member is (*p).member, but readable
#include <stdio.h>

struct point { int x, y; };

int main(void) {
    struct point pt = { 3, 4 };
    struct point *pp = &pt;               /* pp points at pt */

    printf("(*pp).x = %d, pp->x = %d\n", (*pp).x, pp->x);   /* same thing */
    pp->y = 99;                           /* write through the pointer */
    printf("pt.y is now %d\n", pt.y);     /* the original changed */
    return 0;
}
```

```output
(*pp).x = 3, pp->x = 3
pt.y is now 99
```

`pp->x` and `(*pp).x` are exactly equivalent - both dereference `pp` and select member `x` - so the first line prints `3` twice. The arrow form just reads far better and avoids a parenthesization trap: writing `*pp.x` would *not* work, because `.` binds tighter than `*`, so it parses as `*(pp.x)` (and `pp` isn't a struct). The important line is the second: `pp->y = 99` reaches back through the pointer and changes the *real* `pt`, so `pt.y` is now 99. A write through a struct pointer modifies the original object - that's the whole reason to use one.

## Why this dominates real C

Passing `struct foo *` instead of `struct foo` is the default in serious C for three reasons: it copies only an address rather than the whole record; it lets the function mutate the caller's object (the only way to "return" changes through a parameter); and it enables data structures that *link* structs together by address - lists, trees, graphs (next section). The standard library and OS are built this way: `FILE *`, `struct stat *` filled in by [`stat`](https://man7.org/linux/man-pages/man2/stat.2.html), `struct sockaddr *` - you hand the kernel a pointer to a struct and it writes the fields. When a function only *reads* the struct, mark the parameter `const struct foo *p` to promise it won't modify your data and to let the compiler enforce that. One subtlety: `++p->x` increments the *member* `x` (because `->` binds tighter than `++`), whereas `(++p)->x` would advance the pointer first - precedence matters once you mix arrow with other operators.

## Go deeper
- [The `->` operator (C)](https://en.cppreference.com/w/c/language/operator_member_access#Member_access_through_pointer) - definition and precedence
- [`stat(2)`](https://man7.org/linux/man-pages/man2/stat.2.html) - a kernel API that fills a struct via pointer
- [`const` correctness](https://en.cppreference.com/w/c/language/const) - read-only struct pointers
- [Pointers (C)](https://en.cppreference.com/w/c/language/pointer) - the addresses underneath
