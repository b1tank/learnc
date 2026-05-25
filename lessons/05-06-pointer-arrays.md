---
id: 05-06-pointer-arrays
chapter: 5
label: "5.6"
title: Pointer Arrays; Pointers to Pointers
prev: ex-5-5
next: ex-5-6
status: done
---

A pointer can point to any type, including another pointer. An **array of pointers** is a common C structure used wherever you have "a list of things, each thing variable-sized".

## A list of strings

The most familiar example: an array of strings.

```c
char *months[] = {
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
};
```

Each element is a `char *` — a pointer to the first byte of a string literal. The array is 12 pointers (96 bytes on 64-bit); the strings live separately, immutable in `.rodata`.

Compare with a 2D `char` array:

```c
char months[12][10] = { "January", "February", ... };
```

This is a contiguous 120-byte block, each row 10 bytes, padded with zeros. Wastes space when strings vary in length; you can't grow a row past its declared width.

Pointer arrays are the right tool when:

- Strings (or sub-arrays) vary in length.
- You want to swap/reorder them cheaply — swap pointers, not data.
- The data is immutable (string literals) and can be shared.

## Sorting strings without moving them

The classic K&R trick: build an array of pointers and sort the pointers, not the strings.

```c:starter
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* qsort comparator for an array of (char *) */
int cmp_str(const void *a, const void *b) {
    const char *const *pa = a;
    const char *const *pb = b;
    return strcmp(*pa, *pb);
}

int main(void) {
    const char *names[] = { "alice", "bob", "carol", "dave", "eve" };
    /* shuffle a bit */
    const char *shuffled[] = { "carol", "alice", "eve", "bob", "dave" };
    int n = (int)(sizeof shuffled / sizeof shuffled[0]);

    qsort(shuffled, n, sizeof shuffled[0], cmp_str);

    for (int i = 0; i < n; ++i)
        printf("%s\n", shuffled[i]);
    return 0;
}
```

```output
alice
bob
carol
dave
eve
```

`qsort` swaps 8-byte pointers; the underlying string data never moves.

## Pointer to pointer

A `char **` is "a pointer to a `char *`". The most common appearance:

```c
int main(int argc, char **argv) { ... }
```

`argv` is a pointer to a pointer to a `char`. `argv[0]` is a `char *` (the first argument string). `argv[0][0]` is the first character of that string. `*argv` is the same as `argv[0]`.

In drawings:

```
argv ──→ ┌──────┐    ┌───────────────┐
         │ argv[0] ──→│ "./program\0" │
         ├──────┤    └───────────────┘
         │ argv[1] ──→ ...
         ├──────┤
         │ NULL │
         └──────┘
```

The last entry is `NULL`, marking the end. So you can iterate without knowing `argc`:

```c
for (char **p = argv; *p != NULL; ++p)
    printf("%s\n", *p);
```

This is the **classic "array of strings terminated by NULL"** convention used throughout Unix (`environ`, `exec*` family arguments, etc.).

## Modern note

- Modern languages (Rust `Vec<String>`, Go `[]string`, etc.) wrap pointer arrays in a struct that carries length and capacity. In C you usually pass `(strings, count)` pairs.
- For dynamic growth, `realloc` on an array of pointers is cheap (just the pointer table grows; the strings don't move). This is the basis of every dynamic-array-of-strings implementation in C.
- C99's `restrict` and `static` size keywords (`char *const argv[static 1]`) document "argv has at least 1 element" — compilers sometimes use this to optimise; rarely seen in real code.

## Try it

1. Write `int word_count(char *line)` that splits `line` on spaces into an array of `char *` (modifying `line` in place by writing `\0`s). Return the count and the array of pointers.
2. Walk an `environ` like array: `extern char **environ; for (char **e = environ; *e; ++e) puts(*e);`. You'll see every environment variable.
3. Build a 2D array of pointers: `char *grid[3][3] = { ... };`. Each cell is a `char *`. Use it to represent a board game grid where each cell is a label string.

## Notes from the author

- "Array of pointers" is C's solution to many problems that languages with built-in dynamic arrays solve more cleanly. In C you build the abstraction yourself — that's the cost of the language's simplicity.
- The `NULL`-terminated array convention is *almost* as bad as `\0`-terminated strings. You can't get the length without walking, and forgetting the terminator is a common bug. But it's everywhere in Unix APIs, so learn it.
- The `qsort` comparator boilerplate (cast `void *` to `const T *const *`, dereference once) is a piece of C you'll write a hundred times in your career. Some style guides ban `qsort` outright in favour of typed sort macros; both are defensible.

*Click **next →** for true multi-dimensional arrays.*
