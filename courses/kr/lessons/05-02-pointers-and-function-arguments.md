---
id: 05-02-pointers-and-function-arguments
chapter: 5
label: "5.2"
title: Pointers and Function Arguments
prev: 05-01-pointers-and-addresses
next: ex-5-1
status: done
---

C passes arguments **by value**: a function receives *copies* of its arguments, so assigning to a parameter changes only the local copy, never the caller's variable. That's a problem when a function needs to *modify* something the caller owns - like a swap routine. The fix is to pass a **pointer**: the caller hands over the *address* of its variable, and the function dereferences that address to reach the original object. This "call by reference, simulated with pointers" is how C functions return results through their parameters.

## Modifying the caller's variables

```c:run swap works only because we pass addresses
#include <stdio.h>

void swap(int *a, int *b) {   /* receives addresses, not values */
    int t = *a;
    *a = *b;                  /* writes through the pointers... */
    *b = t;                   /* ...so the caller's vars change */
}

int main(void) {
    int x = 3, y = 7;
    printf("before: x=%d y=%d\n", x, y);
    swap(&x, &y);             /* pass the ADDRESSES of x and y */
    printf("after:  x=%d y=%d\n", x, y);
    return 0;
}
```

```output
before: x=3 y=7
after:  x=7 y=3
```

If `swap` took plain `int a, int b`, it would shuffle its own copies and `main`'s `x`/`y` would be untouched. By taking `int *a, int *b` and calling `swap(&x, &y)`, the function receives the *locations* of `x` and `y`; `*a` and `*b` are then aliases for the originals, so the exchange sticks. The pointers themselves are still passed by value (the addresses are copied) - but those copies point at the very objects we want to change.

## Why `scanf` needs `&`, and the efficiency angle

This is exactly why you write `scanf("%d", &n)` and not `scanf("%d", n)`: `scanf` must *store into* your variable, so it needs the address. Forgetting the `&` passes the (garbage) value of an uninitialized `n` as if it were an address, and `scanf` writes through it - a crash or silent corruption. Pointers serve a second purpose too: passing a large object (a big `struct`, or an array) by pointer copies only an 8-byte address instead of duplicating the whole thing, which is faster and uses less stack. When a function only *reads* through such a pointer, mark it `const` (`const int *p`) to promise it won't modify the caller's data - the compiler then enforces that promise. Arrays are the special case: an array argument *automatically* passes as a pointer to its first element, which the next section explores.

## Go deeper
- [Evaluation strategy: call by value](https://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_value) - C's model
- [Pointer parameters (C)](https://en.cppreference.com/w/c/language/pointer) - modifying through a pointer
- [`scanf` and `&`](https://en.cppreference.com/w/c/io/fscanf) - why it takes addresses
- [`const` correctness](https://en.cppreference.com/w/c/language/const) - promising read-only access
