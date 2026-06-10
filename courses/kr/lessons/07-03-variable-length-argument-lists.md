---
id: 07-03-variable-length-argument-lists
chapter: 7
label: "7.3"
title: 'Variable-length Argument Lists'
prev: ex-7-2
next: ex-7-3
status: done
---

How does `printf` accept *any number* of arguments of *any* types? Through C's **variadic function** mechanism, exposed to you in `<stdarg.h>`. A function declared with `...` after its named parameters can be called with extra arguments; inside, you walk over them one at a time with a `va_list` cursor and the macros `va_start`, `va_arg`, and `va_end`. The catch - and it's a big one - is that the language gives you *no way to know* how many extra arguments arrived or what types they are. You must determine that yourself, from a count parameter or from a format string like `printf`'s.

## Writing your own variadic function

```c:run sum a variable number of ints
#include <stdio.h>
#include <stdarg.h>

int sum(int count, ...) {           /* count tells us how many follow */
    va_list ap;                     /* the argument cursor */
    va_start(ap, count);            /* start it just after 'count' */
    int total = 0;
    for (int i = 0; i < count; i++)
        total += va_arg(ap, int);   /* fetch next arg AS an int, advance */
    va_end(ap);                     /* clean up */
    return total;
}

int main(void) {
    printf("sum(3, 10,20,30) = %d\n", sum(3, 10, 20, 30));
    printf("sum(5, 1,2,3,4,5) = %d\n", sum(5, 1, 2, 3, 4, 5));
    return 0;
}
```

```output
sum(3, 10,20,30) = 60
sum(5, 1,2,3,4,5) = 15
```

The protocol is fixed: declare a `va_list`, `va_start(ap, last)` where `last` is the *name of the final named parameter* (here `count`), then call `va_arg(ap, TYPE)` once per argument to read it and advance the cursor, and finally `va_end(ap)`. There must be **at least one named parameter** before the `...` - that's what `va_start` anchors to, and it's how the callee knows where the variable part begins. Here `count` does double duty: it's the anchor *and* it tells the loop how many `int`s to pull.

## How it works underneath, and the sharp edges

Variadic arguments rely entirely on the platform's **[calling convention](https://en.wikipedia.org/wiki/Calling_convention) / [ABI](https://en.wikipedia.org/wiki/Application_binary_interface)**. On the x86-64 System V ABI, integer arguments arrive in registers (rdi, rsi, rdx, …) and `va_arg` is compiler magic that knows where each successive value lives - the `va_list` is really a small struct tracking register-save areas and a stack overflow pointer. Two rules fall out of this and bite the unwary. First, **default argument promotions** apply to everything passed through `...`: `char`/`short` become `int`, and `float` becomes `double`. So you must write `va_arg(ap, int)` to read what was a `char`, and `va_arg(ap, double)` to read a `float` - using the original narrow type reads the wrong bytes. Second, you must request *exactly* the type that was passed: ask for an `int` where a `double` was given and you'll silently misread the stack. Because nothing is checked, variadic functions are inherently type-unsafe - which is why modern C++ prefers templates/fold-expressions and why `printf`-style functions get special compiler `__attribute__((format))` warnings. When you do need them, the count-or-sentinel discipline (a leading count, or a terminating `NULL`/`0`) is mandatory.

## Go deeper
- [`<stdarg.h>`](https://en.cppreference.com/w/c/variadic) - `va_list`, `va_start`, `va_arg`, `va_end`
- [`stdarg(3)`](https://man7.org/linux/man-pages/man3/stdarg.3.html) - usage and gotchas
- [Calling conventions](https://en.wikipedia.org/wiki/X86_calling_conventions) - where the extra args actually sit
- [Default argument promotions](https://en.cppreference.com/w/c/language/conversion#Default_argument_promotions) - why `char`/`float` widen
