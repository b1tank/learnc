---
id: 07-02-formatted-output-printf
chapter: 7
label: "7.2"
title: 'Formatted Output — Printf'
prev: ex-7-1
next: ex-7-2
status: done
---

`printf` is the workhorse of C output. Its first argument is a **format string** with `%`-conversions that pull values from the rest of the arguments.

```c
printf("Hello, %s! You are %d years old.\n", "Alice", 30);
```

The `%s` consumes the next argument as a string; `%d` consumes the next as a decimal int.

## The common conversions

| Spec   | Meaning                                  | Example              |
|--------|------------------------------------------|----------------------|
| `%d`   | signed decimal int                       | `printf("%d", 42)`   |
| `%u`   | unsigned decimal                         | `printf("%u", 42u)`  |
| `%o`   | octal                                    | `printf("%o", 8)` → `10` |
| `%x`   | lowercase hex                            | `printf("%x", 255)` → `ff` |
| `%X`   | uppercase hex                            | `printf("%X", 255)` → `FF` |
| `%f`   | float (decimal notation)                 | `printf("%f", 3.14)` → `3.140000` |
| `%e`   | float (exponential)                      | `printf("%e", 3.14)` → `3.140000e+00` |
| `%g`   | float (compact)                          | `printf("%g", 3.14)` → `3.14` |
| `%c`   | char                                     | `printf("%c", 'A')`  |
| `%s`   | string                                   | `printf("%s", "hi")` |
| `%p`   | pointer (impl-defined)                   | `printf("%p", &x)`   |
| `%%`   | a literal `%`                            | `printf("%%")` → `%` |

## Width, precision, flags

The full conversion syntax: `% [flags] [width] [.precision] [length] specifier`.

```c
printf("[%5d]\n",   42);      /* width 5, right-align:    "[   42]" */
printf("[%-5d]\n",  42);      /* width 5, left-align:     "[42   ]" */
printf("[%05d]\n",  42);      /* width 5, zero-pad:       "[00042]" */
printf("[%+d]\n",   42);      /* force sign:              "[+42]"   */
printf("[%.2f]\n",  3.14159); /* 2 decimal places:        "[3.14]"  */
printf("[%10.2f]\n",3.14159); /* width 10, 2 decimals:    "[      3.14]" */
printf("[%.5s]\n",  "hello world"); /* max 5 chars of s: "[hello]" */
```

## Putting it together

```c:starter
#include <stdio.h>

int main(void) {
    printf("decimal:    %d\n",    42);
    printf("hex:        %#x\n",   255);
    printf("octal:      %o\n",    8);
    printf("float:      %f\n",    3.14);
    printf("scientific: %e\n",    1234.5);
    printf("compact:    %g\n",    1234.5);
    printf("padded:     [%10.3f]\n", 3.14159);
    printf("string cut: [%.5s]\n", "hello, world");
    printf("right-pad:  [%-10s]X\n", "hi");
    return 0;
}
```

```output
decimal:    42
hex:        0xff
octal:      10
float:      3.140000
scientific: 1.234500e+03
compact:    1234.5
padded:     [     3.142]
string cut: [hello]
right-pad:  [hi        ]X
```

## Length modifiers for size

When you have `long`, `short`, `long long`, etc., add a length modifier:

| Modifier | Use with        | Type                |
|----------|------------------|---------------------|
| `h`      | `d`/`u`/`x`/`o`  | `short`              |
| `l`      | `d`/`u`/`x`/`o`  | `long`               |
| `ll`     | `d`/`u`/`x`/`o`  | `long long`          |
| `j`      | `d`/`u`/`x`/`o`  | `intmax_t`           |
| `z`      | `d`/`u`/`x`/`o`  | `size_t`             |
| `L`      | `f`/`e`/`g`      | `long double`        |

```c
size_t n = sizeof(int);
printf("size = %zu\n", n);      /* %zu, not %d or %u! */
```

Mismatching the conversion and the argument type is **undefined behaviour**. Enable compiler warnings (`-Wformat`) to catch it.

## printf vs. variants

| Function       | Output destination          |
|----------------|-----------------------------|
| `printf`       | `stdout`                    |
| `fprintf(fp, ...)` | a specific `FILE *`       |
| `sprintf(buf, ...)` | a string buffer (**unsafe — no bound!**) |
| `snprintf(buf, n, ...)` | a string buffer with bound (**use this**) |
| `vprintf` / `vfprintf` / `vsnprintf` | take a `va_list` (see next section) |

**Always prefer `snprintf` over `sprintf`.** `sprintf` has caused decades of buffer-overflow CVEs.

## Try it

1. Print the same number in decimal, hex, and octal in one `printf` call.
2. Build a table-aligned output: name in a 12-char field, age in a 4-char right-aligned field.
3. Try `%*d` — the `*` reads the width from the argument list. `printf("%*d\n", 10, 42)`.

## Notes from the author

- `printf`'s format string is its own little language. Knowing it well is a real productivity win — you can format a complete table report in one call.
- The variadic nature makes `printf` impossible for the compiler to fully type-check unless the format string is a compile-time constant. GCC's `-Wformat` works for literals; format strings built at runtime are unchecked.
- For numerical output that needs locale formatting (commas, locale decimals), `printf` is too low-level. Use `<locale.h>` and `printf`'s `'` flag, or build a small helper.

*Click **next →** for variadic functions.*
