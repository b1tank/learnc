---
id: 07-04-formatted-input-scanf
chapter: 7
label: "7.4"
title: 'Formatted Input — Scanf'
prev: ex-7-3
next: ex-7-4
status: done
---

`scanf` is `printf`'s mirror image: it reads characters from `stdin`, parses them according to a format string, and stores the results into pointer arguments.

```c
int  a, b;
scanf("%d %d", &a, &b);     /* read two integers separated by whitespace */
```

**You MUST pass pointers.** `scanf("%d", a)` is a classic bug — the compiler can't warn you about it (with default flags); the program crashes at runtime.

## The common conversions

| Spec   | Reads                                      | Argument type      |
|--------|--------------------------------------------|---------------------|
| `%d`   | optional sign + decimal digits             | `int *`              |
| `%u`   | decimal digits                             | `unsigned *`         |
| `%x`   | hex digits (optional `0x`)                  | `unsigned *`         |
| `%o`   | octal digits                                | `unsigned *`         |
| `%f`/`%e`/`%g` | float                                | `float *`            |
| `%lf`  | double                                       | `double *`           |
| `%c`   | one char (NO whitespace skipping!)           | `char *`             |
| `%s`   | run of non-whitespace + adds `\0`            | `char[]`             |
| `%[abc]` | run of chars in the set                    | `char[]`             |
| `%[^\n]` | run of chars NOT in the set                | `char[]`             |
| `%%`   | matches a literal `%`                        | (no arg)             |

## Return value

`scanf` returns the **number of successfully matched fields**. Always check it!

```c
int a, b;
if (scanf("%d %d", &a, &b) != 2) {
    fprintf(stderr, "expected two integers\n");
    return 1;
}
```

A return of less than expected means parsing stopped at a non-matching character. A return of `EOF` means the stream ended (or had an error) before any matches.

## A tiny calculator

```c:starter
#include <stdio.h>

int main(void) {
    double a, b;
    char op;
    printf("enter: <num> <op> <num>\n> ");
    if (scanf("%lf %c %lf", &a, &op, &b) != 3) {
        fprintf(stderr, "parse error\n");
        return 1;
    }
    double result;
    switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = b ? a / b : 0; break;
        default:  fprintf(stderr, "unknown op '%c'\n", op); return 1;
    }
    printf("%g %c %g = %g\n", a, op, b, result);
    return 0;
}
```

```output
(awaits input — try '3 + 4')
3 + 4 = 7
```

## Whitespace handling

By default `scanf` treats whitespace specially:

- Whitespace in the format string matches *any amount* of whitespace in the input, including zero.
- Most conversions (`%d`, `%f`, `%s`) automatically skip leading whitespace.
- `%c` does NOT skip whitespace — a leading space (`" %c"`) is the workaround.

```c
char c;
scanf(" %c", &c);    /* skip whitespace, then read one char */
```

## The `%s` foot-gun

`%s` reads a non-whitespace run into a buffer **with no bound check**. The classic exploit:

```c
char buf[16];
scanf("%s", buf);   /* user types 1000 chars → stack overflow */
```

**Always use a width modifier:**

```c
scanf("%15s", buf);   /* read at most 15 chars + the implicit \0 */
```

This is the `scanf` analogue of `snprintf`. The width is *characters*, not buffer size; reserve one byte for the null terminator.

## When scanf falls down

`scanf` is great for *well-formed structured input* but terrible for free-form data. Real-world parsing usually wants:

1. `fgets` a line into a buffer.
2. `sscanf` or hand-parse from that buffer.
3. On parse failure, you can re-prompt with the line intact.

With raw `scanf` on `stdin`, a parse failure leaves the unmatched characters in the input buffer, leading to infinite loops if you retry naively.

## Try it

1. Read three integers per line until EOF; print their sum each time.
2. Read a line into a buffer with `fgets`, then use `sscanf` to parse it. Compare to direct `scanf`.
3. Read a sequence of `"name=value"` pairs into a struct. (`%[^=]=%[^\n]` is your friend.)

## Notes from the author

- `scanf` is a "use with caution" API. It's appropriate for teaching, prototyping, and simple tools. For production parsing, prefer `fgets` + custom parsing, or use `strtol`/`strtod` which give you better error semantics.
- The `%lf` (lowercase L) for `double` vs. `%f` for `float` trips up newcomers daily. Modern compilers warn (`-Wformat`); turn that on and pay attention.
- The `n` conversion (`%n`) writes the number of characters consumed so far into an `int *`. It's powerful but a security hazard — many libc implementations disable it for format-string-from-input.

*Click **next →** for file access.*
