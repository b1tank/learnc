---
id: 04-functions-and-expressions
chapter: 2
label: "2.1"
title: Functions, expressions, and the increment operator
prev: 03-local-variable-lifetimes
next: 05-integer-types
status: draft
source:
  videoId: mw4gUqsGPZw
  url: https://www.youtube.com/watch?v=mw4gUqsGPZw
---

> **Source video.** [Let's Learn C - lesson 3](https://www.youtube.com/watch?v=mw4gUqsGPZw) by Salvatore Sanfilippo (antirez).

## TL;DR

A C function takes parameters and may return a value. `x = x + 1` is an **expression** (it produces a value); add a `;` and it becomes a **statement**. The shorthand `x++` does the same increment. Arguments are passed **by value** - the function works on a copy, so the caller's variable is unchanged unless the caller assigns the return value back.

## Expressions and statements `[00:00 → 02:02]`

`x + 1` on its own is an **expression**: a recipe that yields a value. The assignment `x = x + 1` is also an expression - its value is the value just stored - and the trailing `;` is what turns it into a **statement**, the unit the compiler executes in order. Read `=` as "copy the value on the right into the variable on the left," and do not confuse it with `==`, the equality test; they are different operators, and swapping one for the other inside an `if` is a classic bug.

## Locals reset; globals and static persist `[03:59 → 07:36]`

Salvatore starts with a no-argument `inc()` whose `x` is a plain local. Because that `x` is created fresh on every call, calling `inc()` four times prints `2` four times - the increment never accumulates, since each call builds `x`, adds one, prints, and throws it away. Move `x` *outside* every function and it becomes a **global**: one cell that lives for the whole run, so the same four calls now climb `1 2 3 4`. A `static` local sits in between - a global's lifetime, but a name only its own function can see:

```c:run global vs static persistence
#include <stdio.h>

int g = 0;                 /* global: one cell for the whole program */

void inc_global(void) {
    g = g + 1;
    printf("%d ", g);
}

void inc_static(void) {
    static int s = 0;      /* global lifetime, local visibility */
    s = s + 1;
    printf("%d ", s);
}

int main(void) {
    inc_global(); inc_global(); inc_global(); inc_global();
    printf("\n");
    inc_static(); inc_static(); inc_static(); inc_static();
    printf("\n");
    return 0;
}
```

```output
1 2 3 4 
1 2 3 4 
```

`g` and `s` count identically here, but they differ in *visibility*: try `printf("%d", s)` from `main` and it won't compile - `s` is global in lifetime but local in scope, so only `inc_static` knows the name. (A `static` like this is also why such a function is not thread-safe: two threads incrementing the same hidden cell would race.)

## A function with a parameter `[08:07 → 09:30]`

Now `inc` *takes* an `int` and *returns* one:

```c
int inc(int x) {
    x = x + 1;
    return x;
}
```

Inside `inc`, `x` is a brand-new local seeded with a copy of the caller's value. It is not the caller's variable - just a variable that started life holding the same number.

## Pass-by-value, always `[10:53 → 11:34]`

So calling `inc(a)` does **not** modify `a`; it modifies `inc`'s private copy. The change only "sticks" if the caller writes the result back with `a = inc(a)`:

```c:run inc with and without capturing the result
#include <stdio.h>

int inc(int x) {
    x = x + 1;
    return x;
}

int main(void) {
    int a = 10;
    inc(a);
    printf("after inc(a):     a = %d\n", a);
    a = inc(a);
    printf("after a = inc(a): a = %d\n", a);
    a = inc(a);
    printf("after a = inc(a): a = %d\n", a);
    return 0;
}
```

```output
after inc(a):     a = 10
after a = inc(a): a = 11
after a = inc(a): a = 12
```

The first call's return value is discarded, so `a` keeps its `10`; only the assignments move it. C is pass-by-value everywhere - even a whole struct is copied into the callee. The only way to let a function reach back and mutate the caller's data is to hand it a **pointer** (next lesson).

## Pass-by-value at the register level

You can see the copy in the assembly. Compile `inc` alone with `gcc -O2 -masm=intel`:

```asm
inc:
        endbr64
        lea     eax, 1[rdi]   ; eax = x + 1, computed from the incoming copy
        ret
```

The System V ABI hands the first `int` argument to `inc` in `edi`, and the return value goes back in `eax`. `inc` reads `edi`, computes `+ 1` into `eax`, and returns - it never has the address of the caller's `a`, only a value that arrived in a register. There is physically nothing on the caller's side for it to mutate. (`lea`, "load effective address", is just a cheap adder here: `1[rdi]` is an addressing expression, but no memory is touched.)

## The ++ shorthand `[23:16 → 23:52]`

`x++` and `++x` both mean "increment `x` by one" - the name C++ is the joke that it is C, incremented. They differ only in the *value the expression produces*: `x++` evaluates to the **old** `x`, `++x` to the **new** one. The side effect on `x` is identical:

```c:run prefix vs postfix increment
#include <stdio.h>

int main(void) {
    int x = 5;
    int a = x++;   /* postfix: a gets the OLD x, then x becomes 6 */
    int y = 5;
    int b = ++y;   /* prefix:  y becomes 6, then b gets the NEW y */
    printf("postfix: a = %d, x = %d\n", a, x);
    printf("prefix:  b = %d, y = %d\n", b, y);
    return 0;
}
```

```output
postfix: a = 5, x = 6
prefix:  b = 6, y = 6
```

Both `x` and `y` end at `6`; the only difference is what the surrounding assignment saw at the moment it ran.

## What the optimiser makes of ++

Strip the printing away and ask `gcc -O2 -masm=intel` to compile three tiny functions:

```asm
post:                  ; int post(int x) { return x++; }
        endbr64
        mov     eax, edi      ; return the OLD x; the increment is never observed
        ret
pre:                   ; int pre(int x) { return ++x; }
        endbr64
        lea     eax, 1[rdi]   ; return x + 1, in one instruction
        ret
both:                  ; int both(int x) { x++; ++x; return x; }
        endbr64
        lea     eax, 2[rdi]   ; two increments folded into x + 2
        ret
```

In `post`, the optimiser proves the post-increment's result is never used and drops the increment entirely - the function is just a register move. In `both`, the two separate increments collapse into a single `+ 2`. Once the optimiser can see that an intermediate value is never read, the prefix-vs-postfix distinction evaporates; it only matters when the expression's value is actually observed.
