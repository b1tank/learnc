---
id: 07-03-variable-length-argument-lists
chapter: 7
label: "7.3"
title: 'Variable-length Argument Lists'
prev: ex-7-2
next: 07-04-formatted-input-scanf
status: done
---

Functions like `printf` accept any number of arguments of any types. This is **variadic functions**, declared with `...` and implemented with the macros in `<stdarg.h>`.

```c
#include <stdarg.h>

void minimal_printf(const char *fmt, ...);
```

The `...` says "more arguments may follow". Inside the function, you can't access them by name — you use a `va_list` and walk it with `va_arg`.

## The pattern

```c
void minimal_printf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);          /* point ap at the first arg AFTER fmt */
    /* call va_arg(ap, type) to fetch each one in turn */
    va_end(ap);                  /* clean up */
}
```

Three macros:

- `va_start(ap, last_named)` — initialise.
- `va_arg(ap, type)` — fetch the next argument as `type` and advance.
- `va_end(ap)` — finalise (required for portability).

The caller's argument *types* are NOT recorded anywhere; the format string carries that information.

## A tiny printf

```c:starter
#include <stdio.h>
#include <stdarg.h>

void minimal_printf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    for (const char *p = fmt; *p; ++p) {
        if (*p != '%') {
            putchar(*p);
            continue;
        }
        switch (*++p) {
        case 'd': {
            int i = va_arg(ap, int);
            printf("%d", i);
            break;
        }
        case 'f': {
            double f = va_arg(ap, double);
            printf("%g", f);
            break;
        }
        case 's': {
            const char *s = va_arg(ap, const char *);
            fputs(s, stdout);
            break;
        }
        case '%':
            putchar('%');
            break;
        default:
            putchar('%');
            putchar(*p);
        }
    }
    va_end(ap);
}

int main(void) {
    minimal_printf("name=%s, age=%d, score=%f\n", "Alice", 30, 95.5);
    minimal_printf("%d%% done\n", 50);
    return 0;
}
```

```output
name=Alice, age=30, score=95.5
50% done
```

## Default argument promotions

When you pass variadic arguments, C does **default promotions**:

- `float` → `double`
- `char`, `short` → `int`
- bool → `int`

That's why `va_arg(ap, double)` for `%f`, not `va_arg(ap, float)`. The float was already widened to double when passed.

Same trap: `va_arg(ap, short)` is **undefined behaviour** — there's no `short` on the variadic argument stack; you must use `int` and cast.

## Forwarding to printf

A common pattern: your function takes a format-string, prepends a prefix, and calls `vprintf`/`vfprintf`/`vsnprintf` with the same `va_list`:

```c
void log_msg(const char *level, const char *fmt, ...) {
    fprintf(stderr, "[%s] ", level);
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fputc('\n', stderr);
}

log_msg("info", "user=%s age=%d", "Alice", 30);
```

`vfprintf` is the version of `fprintf` that takes a `va_list`. Every `printf`-like function should have a `v`-version for exactly this case.

## Try it

1. Extend `minimal_printf` to handle `%c` and `%x`.
2. Write `sum_ints(int count, ...)` that adds `count` integers.
3. Build a `log_msg` like above and use it in another small program.

## Notes from the author

- Variadic functions are a 1970s solution to "I don't know how many args yet". C++ has variadic templates that do this with full type safety; C still uses the same `<stdarg.h>` macros from K&R 2e.
- The format-string-as-instructions design is great for ergonomics but bad for safety. `printf("%s", user_input)` is safe; `printf(user_input)` is a format-string attack waiting to happen.
- `va_copy` (C99) lets you duplicate a `va_list` if you need to iterate twice (e.g. once to compute total size, once to write). It's not in K&R 2e but is essential modern hygiene.

*Click **next →** for `scanf`.*
