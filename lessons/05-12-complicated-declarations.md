---
id: 05-12-complicated-declarations
chapter: 5
label: "5.12"
title: Complicated Declarations
prev: ex-5-17
next: ex-5-18
status: done
---

C declarations can become truly bewildering when arrays, pointers, and functions combine. Some real examples:

| Declaration                          | What it means                                                |
|--------------------------------------|---------------------------------------------------------------|
| `int *p`                             | `p` is a pointer to `int`                                     |
| `int *p[10]`                         | `p` is an array of 10 pointers to `int`                       |
| `int (*p)[10]`                       | `p` is a pointer to an array of 10 `int`                      |
| `int f(int)`                         | `f` is a function returning `int`                             |
| `int *f(int)`                        | `f` is a function returning pointer to `int`                  |
| `int (*f)(int)`                      | `f` is a pointer to a function returning `int`                |
| `int *(*f)(int)`                     | `f` is a pointer to a function returning pointer to `int`     |
| `int (*f[10])(int)`                  | `f` is an array of 10 pointers to function returning `int`    |

The rule: **start from the identifier and read outward, following precedence**.

- `()` and `[]` bind tighter than `*`.
- Parentheses group.

Apply that to `int (*f)(int)`:

1. `f` — the identifier.
2. `*f` — `f` is a pointer.
3. `(*f)(int)` — pointer to a function taking `int`.
4. `int (*f)(int)` — pointer to a function taking `int` and returning `int`.

## The `cdecl` translator

There's a program called `cdecl` that translates C declarations to and from English:

```
cdecl> explain int *(*f)(int)
declare f as pointer to function (int) returning pointer to int
```

You can install it (`apt install cdecl`) or use [cdecl.org](https://cdecl.org) online. For genuinely hairy declarations, paste them in.

## The typedef strategy

Almost every multi-level declaration becomes readable with one or two `typedef`s:

```c
/* hard: */
int (*funcs[10])(int, int);

/* easier: */
typedef int (*binop)(int, int);
binop funcs[10];
```

Each layer of pointer-to / function-of indirection gets a name. The code reads like English:

```c
typedef int (*op)(int, int);          /* an op is a binary int->int function */
typedef op  op_table[10];              /* an op_table is 10 ops */
op_table the_ops;                      /* the_ops is a table of 10 ops */
```

This is also the way to build a vtable-like structure in C: typedef the method types, group them into a struct, and pass struct pointers around.

## A worked example: signal handlers

The historical `<signal.h>` declaration:

```c
void (*signal(int sig, void (*func)(int)))(int);
```

Reading right-to-left, starting at `signal`:

1. `signal(...)` — function called with some arguments.
2. `(*signal(...))` — the result is a pointer (we'll see what to).
3. `(*signal(...))(int)` — the result is a pointer to a function taking `int`.
4. `void (*signal(...))(int)` — that function returns `void`.

So: "`signal` is a function that takes (an int, and a pointer to a function taking int returning void), and returns a pointer to a function taking int returning void."

With typedefs:

```c
typedef void (*sig_handler)(int);
sig_handler signal(int sig, sig_handler func);
```

Now it's just "`signal` takes a signal number and a handler, returns the previous handler". Same function, vastly clearer signature.

## A starter

```c:starter
#include <stdio.h>

/* declare three things at once and decipher them */
int main(void) {
    /* x: array of 3 pointers to int */
    int a = 1, b = 2, c = 3;
    int *x[3] = { &a, &b, &c };
    printf("*x[0]=%d *x[1]=%d *x[2]=%d\n", *x[0], *x[1], *x[2]);

    /* y: pointer to array of 3 ints */
    int arr[3] = { 10, 20, 30 };
    int (*y)[3] = &arr;
    printf("(*y)[0]=%d (*y)[1]=%d (*y)[2]=%d\n", (*y)[0], (*y)[1], (*y)[2]);

    /* f: pointer to function taking int returning int */
    int (*f)(int) = NULL;       /* would point to a real function */
    (void)f;                    /* silence unused warning */

    return 0;
}
```

```output
*x[0]=1 *x[1]=2 *x[2]=3
(*y)[0]=10 (*y)[1]=20 (*y)[2]=30
```

## Modern note

- Modern coding conventions (LLVM, Linux kernel) typedef every function-pointer type and most array-of-pointer types. If a declaration would require more than one layer of `*` and `[]`, use a typedef.
- C23 keeps the legacy syntax. The proposed `auto` as a type doesn't help (it's for `_Generic`-like inference, not declaration simplification).
- AI tools and IDEs now do this translation automatically — hover over a declaration in any modern editor and you'll see the English form. The mental model still helps you read code without tooling.

## Try it

1. Decipher `char (*(*f[10])(void))[5]` — array of 10, of pointers to functions taking void returning pointers to arrays of 5 chars. Build it step by step.
2. Convert the above to typedef form. The typedef version is short enough to fit on one line.
3. Run `cdecl` (or visit cdecl.org) on a few real-world declarations: try `<signal.h>`'s `sa_handler` and `sa_sigaction` fields. Read both the C form and the English.

🎉 **You've finished Chapter 5's section walkthroughs.** Pointers, arrays, and the deep interplay between them are now in your toolbox. The exercises that follow build word counters, hash tables, and command-line filters.

*Click **next →** to start the Chapter 5 exercises.*
