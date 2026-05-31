---
id: 05-03-pointers-and-arrays
chapter: 5
label: "5.3"
title: Pointers and Arrays
prev: ex-5-2
next: 05-04-address-arithmetic
status: done
---

In C, arrays and pointers are intimately related — so much that beginners often think they're the same thing. They aren't, but the connection is precise: in almost every expression, an array's name **decays** to a pointer to its first element. So if `a` is an array, `a` is shorthand for `&a[0]`, and the subscript `a[i]` is *defined* as `*(a + i)`. That single identity explains why `a[i]`, `*(a+i)`, `p[i]`, and `*(p+i)` are all interchangeable once `p = a`.

## Four ways to say the same thing

```c:run subscripting is pointer arithmetic in disguise
#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;             /* a decays to &a[0]; no & needed */

    printf("a[2]=%d *(p+2)=%d p[2]=%d\n", a[2], *(p + 2), p[2]);
    printf("*(a+3)=%d\n", *(a + 3));   /* a[3], written the long way */
    return 0;
}
```

```output
a[2]=30 *(p+2)=30 p[2]=30
*(a+3)=40
```

`a[2]`, `*(p+2)`, and `p[2]` all name the third element — because the compiler rewrites every `x[i]` as `*(x + i)` whether `x` is an array or a pointer. (A fun consequence: `i[a]` is also legal and equals `a[i]`, since `*(a+i) == *(i+a)`.) The key under-the-hood fact is that `a + 2` doesn't add 2 *bytes* — it adds `2 * sizeof(int)` bytes, because pointer arithmetic is scaled by the element type. That's how the same offset works for `int`, `double`, or `struct` arrays.

## Where arrays and pointers differ

The decay is real, but an array is **not** a pointer. `a` is the name of a contiguous block of storage; `p` is a separate variable holding an address. You can write `p = a;` (point `p` at the array) or `p++` (advance it), but you **cannot** write `a = p;` or `a++` — an array name isn't a modifiable lvalue; it has no storage of its own to reassign. They also report different sizes: `sizeof a` is the whole array (5 × 4 = 20 bytes here), while `sizeof p` is just one pointer (4 bytes in this WebAssembly runtime, 8 on a typical 64-bit native build). And the decay only happens in expressions — it does *not* happen for `&a` (which gives a pointer to the whole array) or `sizeof a`. The most important practical consequence: when you pass an array to a function, it decays to a pointer, so the function receives no size information. That's why C functions on arrays always take a separate length parameter (`f(int a[], int n)` — the `int a[]` is really `int *a`).

## Go deeper
- [Array-to-pointer decay](https://en.cppreference.com/w/c/language/array#Array_to_pointer_conversion) — the precise rule
- [Subscript = `*(a+i)`](https://en.cppreference.com/w/c/language/operator_member_access#Subscript) — how `[]` is defined
- [`sizeof`](https://en.cppreference.com/w/c/language/sizeof) — array vs pointer sizes
- [C arrays](https://en.wikipedia.org/wiki/C_(programming_language)#Arrays) — contiguous storage model
