---
id: 02-08-increment-and-decrement-operators
chapter: 2
label: "2.8"
title: Increment and Decrement Operators
prev: 02-07-type-conversions
next: 02-09-bitwise-operators
status: done
---

`++` and `--` change a variable by 1. Each has two flavours that look almost identical but produce different *expression* values.

## Prefix vs postfix

- `++n` — **prefix**: increment `n` first, then yield the new value.
- `n++` — **postfix**: yield the current value, *then* increment.

The variable ends up incremented either way. The difference is what the surrounding expression sees.

```c:starter
#include <stdio.h>

int main(void) {
    int a = 5;
    int b = a++;        /* postfix: b gets 5, then a becomes 6 */
    int c = ++a;        /* prefix:  a becomes 7, then c gets 7 */

    printf("a=%d, b=%d, c=%d\n", a, b, c);
    return 0;
}
```

```output
a=7, b=5, c=7
```

## Why both forms exist

K&R wanted both because they let you write tight loops without auxiliary temporaries. The classic case is string copy:

```c
while ((*dst++ = *src++) != '\0')
    ;
```

Read it as: "copy the byte at `*src` to `*dst`, advance both pointers, exit when the byte we just copied was the terminator." Each `++` happens *after* its dereference, which is exactly what postfix gives you.

## Don't double-step the same variable

```c
n = n++ + 1;     /* undefined behaviour: n modified twice between sequence points */
arr[i++] = i;    /* undefined: order of side effects unspecified */
```

These compile, but C does not guarantee the order in which `++` takes effect relative to other reads of the same variable in the same expression. Different compilers (and different optimisation levels) produce different results.

The rule of thumb: **don't modify a variable more than once inside a single expression, and don't read it again either except to evaluate the increment**.

## Modern note

C11 formalised the "sequence point" intuition under the term **sequenced before**. The rule is the same in spirit: `i++` modifies `i`, and reading `i` elsewhere in the same expression-statement (other than via that one `++`) is undefined.

UB sanitisers (`-fsanitize=undefined`) catch a lot of these at runtime. Static analysers warn at compile time.

## Try it

1. Translate `for (i = 0; i < 10; i++)` to use prefix `++i`. Behaviour is identical — but in C++ classes with overloaded `++`, prefix is slightly faster (no temporary). In plain C, the optimiser eliminates the difference.
2. Write the squeeze loop yourself: copy `src` to `dst` skipping every `'x'`. The `(*dst++ = *src++)` pattern shines here.
3. Trip the UB rule: `int i = 0; printf("%d %d\n", i++, i++);`. The two calls may print `0 1` or `1 0` depending on the compiler.

## Notes from the author

- The `(*dst++ = *src++)` idiom is iconic K&R-era C. It packs four operations into one expression: deref-src, deref-dst, write, post-increment both. Modern style preference is mixed: some teams ban it for readability, others embrace it as the canonical string-copy. Be able to read it; choose for yourself whether to write it.
- In every non-toy expression, the right reflex is "if this variable changes here, I do not read it again in this same expression." That single discipline avoids 95% of UB-via-side-effects.
- `i++` and `++i` have **identical runtime cost** in C (the optimiser handles it). The "prefix is faster" lore comes from C++ where `++` may be a user-defined function returning an object. In plain C, pick whichever reads better at the call site.

*Click **next →** to study bitwise operators.*
