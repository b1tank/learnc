---
id: 05-08-initialization-of-pointer-arrays
chapter: 5
label: "5.8"
title: Initialization of Pointer Arrays
prev: ex-5-8
next: ex-5-9
status: done
---

A common, elegant use of an array of pointers is a **static lookup table** of strings - initialized once, indexed by an integer. Because the array elements are just `char *` pointers to string literals, the table is compact (only the addresses are stored in the array; the characters live in read-only memory) and the lookup is a single index operation. Marking the table `static` inside a function means it's built once at program load, not rebuilt on every call.

## A name-from-number table

```c:run month names via a static pointer-array table
#include <stdio.h>

char *month_name(int n) {
    static char *name[] = {           /* built once, kept for the program */
        "illegal month",
        "January", "February", "March",     "April",   "May",      "June",
        "July",    "August",   "September", "October", "November", "December"
    };
    /* guard the index, then return the matching pointer */
    return (n < 1 || n > 12) ? name[0] : name[n];
}

int main(void) {
    printf("%s\n", month_name(2));
    printf("%s\n", month_name(12));
    printf("%s\n", month_name(13));     /* out of range -> the guard entry */
    return 0;
}
```

```output
February
December
illegal month
```

The table maps `1→January … 12→December`, with index `0` reserved as the "bad input" sentinel - a tidy trick that lets the function return a valid string for *any* argument without crashing. `month_name(2)` simply returns `name[2]`; no `switch`, no chain of `if`s. Because `name` is `static`, the array of 13 pointers is laid out once when the program loads, pointing at string literals in read-only memory; subsequent calls just index into it. The bounds check (`n < 1 || n > 12`) is essential - indexing a pointer array out of range reads a stray address and dereferencing it (via `%s`) would be undefined behavior.

## Ragged by nature, and why `static` helps

This is the ragged-array advantage from the previous sections made concrete: the month strings have wildly different lengths ("May" vs "September"), yet the table wastes no space - each slot is one pointer, and the strings are packed individually. A rectangular `char[13][10]` would have to size every row for the *longest* name and pad the rest. Two design notes: declaring the table `static const char *const name[]` would additionally promise that neither the pointers nor (via `const char *`) the pointed-to text will change, letting the compiler place the whole thing in read-only memory and catch accidental writes. And keeping it `static` matters for tables of any real size - without it, a large initializer would be *copied onto the stack* on every call, which is both slow and wasteful. Lookup tables like this are the idiomatic C alternative to long `switch` statements for mapping small integer ranges to strings or data.

## Go deeper
- [Array initialization (C)](https://en.cppreference.com/w/c/language/array_initialization) - initializer lists
- [String literals & storage](https://en.cppreference.com/w/c/language/string_literal) - where the text lives
- [`static` storage duration](https://en.cppreference.com/w/c/language/storage_duration) - built-once tables
- [Lookup table](https://en.wikipedia.org/wiki/Lookup_table) - the general technique
