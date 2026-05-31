---
id: 01-08-arguments-call-by-value
chapter: 1
label: "1.8"
title: Arguments — Call by Value
prev: ex-1-15
next: 01-09-character-arrays
status: done
---

In C, **every** argument is passed by value: the function receives a *copy* of the caller's data in its own [stack frame](https://en.wikipedia.org/wiki/Call_stack#Structure). Writing to a parameter scribbles on that private copy and the caller never sees it. This is a deliberate design choice — it keeps functions from accidentally clobbering their callers' variables, and it's why a parameter can double as a convenient local scratch variable.

## A parameter is a private copy

Because `n` inside `power` is a copy, the loop can decrement it to zero as a counter without touching `main`'s `n`:

```c:run mutating a parameter is local
#include <stdio.h>

int power(int base, int n) {
    int p;
    for (p = 1; n > 0; --n)   /* burn down our own copy of n */
        p = p * base;
    return p;
}

int main(void) {
    int n = 3;
    printf("power(2,%d) = %d\n", n, power(2, n));
    printf("n in main is still %d\n", n);   /* untouched */
    return 0;
}
```

```output
power(2,3) = 8
n in main is still 3
```

At the machine level, the call pushes copies of `base` and `n` (in registers and/or on the stack per the [calling convention](https://en.wikipedia.org/wiki/X86_calling_conventions)); `power`'s frame owns them; the frame is torn down on `return`.

## Reaching back out: pass a pointer

If a function *must* modify the caller's variable, you pass the **address** by value. The pointer itself is still copied, but it points at the original storage, so dereferencing reaches the caller's memory. This is how C fakes "call by reference" — and exactly what `&` in `scanf("%d", &x)` is for:

```c:run pointers escape the copy
#include <stdio.h>

void swap_copy(int a, int b) {   /* swaps copies — useless to the caller */
    int t = a; a = b; b = t;
}

void swap_ptr(int *a, int *b) {  /* swaps through addresses — real effect */
    int t = *a; *a = *b; *b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap_copy(x, y);
    printf("after swap_copy: x=%d y=%d\n", x, y);   /* unchanged */
    swap_ptr(&x, &y);
    printf("after swap_ptr:  x=%d y=%d\n", x, y);   /* swapped */
    return 0;
}
```

```output
after swap_copy: x=1 y=2
after swap_ptr:  x=2 y=1
```

The one apparent exception is arrays: when you pass an array, it *decays* to a pointer to its first element, so the function can modify the original elements. But that's not a special rule — you're still passing a pointer by value; you just never copied the array itself.

## Go deeper
- [Evaluation strategy: call by value](https://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_value) — the formal model
- [Call stack & stack frames](https://en.wikipedia.org/wiki/Call_stack) — where the copies live
- [x86-64 calling conventions](https://en.wikipedia.org/wiki/X86_calling_conventions#System_V_AMD64_ABI) — how args actually move into a function
- [Pointers (C)](https://en.cppreference.com/w/c/language/pointer) — passing addresses by value
