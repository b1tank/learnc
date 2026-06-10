---
id: 05-06-pointer-arrays
chapter: 5
label: "5.6"
title: Pointer Arrays; Pointers to Pointers
prev: ex-5-7
next: 05-07-multi-dimensional-arrays
status: done
---

A pointer is a variable, so you can make an **array of pointers** - and a pointer can point at *another* pointer, giving a **pointer to a pointer** (`char **`). An array of `char *` is the natural way to hold a list of strings of *different* lengths: each element is just an address, and the strings themselves can live anywhere, at any size. This is far more flexible (and memory-efficient) than a rectangular `char[N][M]` block, and it's exactly how C represents a program's command-line arguments (`char *argv[]`).

## An array of string pointers

```c:run pointers to strings, and a pointer to a pointer
#include <stdio.h>

int main(void) {
    char *names[] = {"alice", "bob", "carol"};   /* 3 pointers */
    int n = sizeof names / sizeof names[0];
    for (int i = 0; i < n; i++)
        printf("names[%d] = %s\n", i, names[i]);

    char **pp = names;            /* names decays to &names[0]: a char** */
    printf("via pp: %s\n", *(pp + 1));   /* *(pp+1) is names[1] */
    return 0;
}
```

```output
names[0] = alice
names[1] = bob
names[2] = carol
via pp: bob
```

`names` is an array of three `char *`, each pointing to a string literal of its own length ("alice" is 6 bytes, "bob" is 4) - the array stores only the three addresses, not the characters. When `names` appears in an expression it decays to a pointer to its first element, whose type is `char **` (pointer to `char *`). So `pp = names` makes `pp` a pointer-to-pointer; `*(pp + 1)` advances to the second pointer and dereferences it, yielding `"bob"`. Two levels of indirection: `pp` → a `char *` → the actual characters.

## Why two levels of indirection are everywhere

The `char **` pattern shows up constantly. It's how you sort a list of strings *without moving the strings themselves* - you just rearrange the array of pointers (swap addresses, not whole lines), which is cheap regardless of how long the lines are. It's how `main(int argc, char *argv[])` receives arguments: `argv` is a `char **`, an array of string pointers terminated by a `NULL`. And it's how a function can modify a *pointer* the caller holds - pass `&p` (a `T **`) so the function can make the caller's `p` point somewhere new (e.g. `getline`-style functions that allocate and hand back a buffer). The mental model: each `*` you add is one more "follow the address" step. Drawing boxes-and-arrows - array of boxes, each holding an arrow to a string - is the fastest way to keep the levels straight.

## Go deeper
- [Pointer to pointer (C)](https://en.cppreference.com/w/c/language/pointer) - multiple indirection
- [`argv` and command-line args](https://en.cppreference.com/w/c/language/main_function) - the canonical `char **`
- [Array of pointers vs 2D array](https://en.wikipedia.org/wiki/C_(programming_language)#Arrays) - ragged vs rectangular
- [Indirection](https://en.wikipedia.org/wiki/Indirection) - the general concept
