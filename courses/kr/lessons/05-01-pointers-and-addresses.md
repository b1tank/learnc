---
id: 05-01-pointers-and-addresses
chapter: 5
label: "5.1"
title: Pointers and Addresses
prev: ex-4-14
next: 05-02-pointers-and-function-arguments
status: done
---

Every byte of a running program lives somewhere in [memory](https://en.wikipedia.org/wiki/Random-access_memory), and that "somewhere" is a number - an **address**. A **pointer** is simply a variable whose value *is* an address. `&x` ("address of `x`") gives you where `x` lives; `*p` ("contents at `p`") follows the address back to the object. Pointers are why C can talk about memory directly, and they're the foundation for arrays, strings, dynamic allocation, and passing data into functions efficiently. On a 64-bit machine a pointer is just a 64-bit integer holding a memory address.

## Address-of and dereference

```c:run a pointer holds an address; * follows it
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;            /* p holds the ADDRESS of x */
    printf("x = %d, *p = %d\n", x, *p);   /* *p reads through p */
    *p = 99;                /* write through p -> changes x itself */
    printf("after *p = 99, x = %d\n", x);
    return 0;
}
```

```output
x = 42, *p = 42
after *p = 99, x = 99
```

`int *p = &x;` reads as "`p` is a pointer to `int`, initialized to the address of `x`." Now `p` and `x` refer to the *same* object from two angles: `*p` is another name for `x`. Writing `*p = 99` therefore changes `x` to 99 - we never mentioned `x` by name. This indirection is the whole point: a pointer lets one piece of code reach an object that lives elsewhere. The `*` in the *declaration* (`int *p`) means "pointer to," while the `*` in an *expression* (`*p`) means "dereference" - same symbol, two roles.

## Types, sizes, and the null pointer

A pointer's type matters: `int *` and `char *` may hold the same numeric address but the compiler treats them differently - `*p` knows to read 4 bytes for an `int` versus 1 for a `char`, and pointer arithmetic (next sections) scales by the pointed-to size. The pointer *itself* is always the same width on a given platform (8 bytes on a typical 64-bit system), regardless of what it points to, because it's just an address. The special value `NULL` (address zero) means "points to nothing"; dereferencing it is the classic [segmentation fault](https://en.wikipedia.org/wiki/Segmentation_fault), because address 0 is deliberately left unmapped so the [MMU](https://en.wikipedia.org/wiki/Memory_management_unit) traps the access. Always ensure a pointer points at a real object before you dereference it - uninitialized "wild" pointers and dangling pointers (to freed memory) are the source of C's most dangerous bugs.

## Go deeper
- [Pointer (C)](https://en.cppreference.com/w/c/language/pointer) - declaration, `&`, `*`
- [Pointer fundamentals](https://en.wikipedia.org/wiki/Pointer_(computer_programming)) - the concept across languages
- [Virtual address space](https://en.wikipedia.org/wiki/Virtual_address_space) - what an address actually indexes
- [Segmentation fault](https://en.wikipedia.org/wiki/Segmentation_fault) - what dereferencing a bad pointer triggers
