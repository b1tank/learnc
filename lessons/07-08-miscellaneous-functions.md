---
id: 07-08-miscellaneous-functions
chapter: 7
label: "7.8"
title: 'Miscellaneous Functions'
prev: 07-07-line-input-and-output
next: ex-7-9
status: done
---

The standard library has dozens of useful odds-and-ends. This section is a quick tour of the ones you'll reach for most.

## `<string.h>` — string utilities

| Function       | Does                                       |
|----------------|--------------------------------------------|
| `strlen(s)`    | length (not including `\0`)                 |
| `strcpy(d,s)`  | copy (NO bounds; prefer `snprintf`)         |
| `strncpy(d,s,n)` | bounded copy (NOT guaranteed null-term)  |
| `strcat(d,s)`  | append                                      |
| `strcmp(a,b)`  | compare; 0 if equal                         |
| `strncmp(a,b,n)` | compare up to n                          |
| `strchr(s,c)`  | first occurrence of `c` in `s`              |
| `strrchr(s,c)` | last occurrence                              |
| `strstr(s,t)`  | first occurrence of substring `t`           |
| `strtok(s,delim)` | tokenise (stateful; not thread-safe)     |
| `memcpy(d,s,n)` | copy n bytes (no overlap)                  |
| `memmove(d,s,n)` | copy n bytes (overlap OK)                 |
| `memset(d,c,n)` | fill n bytes with c                        |
| `memcmp(a,b,n)` | compare n bytes                            |

## `<ctype.h>` — character classification

| Function        | True for                              |
|-----------------|---------------------------------------|
| `isalpha(c)`    | letter                                 |
| `isdigit(c)`    | `0`–`9`                                |
| `isalnum(c)`    | letter or digit                        |
| `isspace(c)`    | space, `\t`, `\n`, `\v`, `\f`, `\r`     |
| `isupper`/`islower` | case checks                       |
| `tolower`/`toupper` | case conversion                  |
| `iscntrl`       | control char                           |
| `isprint`       | printable (incl. space)                |
| `isgraph`       | printable, NOT space                    |
| `isxdigit`      | hex digit                               |

**Always cast to `unsigned char`** when passing to these — they expect a value in `0..UCHAR_MAX` or `EOF`. A negative `char` is undefined behaviour:

```c
char c = getchar();         /* might be negative on signed-char platforms */
if (isalpha((unsigned char)c)) ...
```

## `<stdlib.h>` — general utilities

| Function           | Does                                  |
|--------------------|---------------------------------------|
| `atoi(s)`          | string → int (no error reporting)    |
| `atof(s)`          | string → double                       |
| `strtol(s, &end, base)` | string → long, with error reporting |
| `strtod(s, &end)`   | string → double, with error reporting |
| `rand()` / `srand` | pseudo-random integers                |
| `qsort(...)`       | sort an array                          |
| `bsearch(...)`     | binary search                           |
| `malloc` / `calloc` / `realloc` / `free` | heap |
| `abs(n)` / `labs` / `llabs` | absolute value                 |
| `div(a, b)`        | quotient AND remainder in one call    |
| `getenv("NAME")`   | environment variable                   |
| `system("cmd")`    | run a shell command                    |

## `<math.h>` — math

| Function           | Does                                  |
|--------------------|---------------------------------------|
| `sqrt`, `cbrt`     | square / cube root                     |
| `pow(x, y)`        | x^y                                    |
| `exp`, `log`, `log2`, `log10` | exp and logs              |
| `sin`, `cos`, `tan` (and `a*`, `*h` variants) | trig + hyperbolic |
| `ceil`, `floor`, `round`, `trunc` | rounding              |
| `fabs(x)`          | absolute value (double)                 |
| `fmod(x, y)`       | floating-point remainder                 |

Link with `-lm` on Linux:

```bash
$ gcc prog.c -lm
```

## Putting some of it together

```c:starter
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>

int main(void) {
    /* string operations */
    const char *s = "Hello, World!";
    printf("length: %zu\n", strlen(s));
    printf("upper:  ");
    for (const char *p = s; *p; ++p) putchar(toupper((unsigned char)*p));
    putchar('\n');

    /* strtol with error checking */
    char *end;
    long v = strtol("  -42abc", &end, 10);
    printf("strtol: %ld, stopped at '%s'\n", v, end);

    /* math */
    printf("sqrt(2) = %.6f\n", sqrt(2.0));
    printf("3^4     = %.0f\n", pow(3.0, 4.0));

    /* random */
    srand(42);          /* fixed seed → reproducible */
    for (int i = 0; i < 5; ++i) printf("%d ", rand() % 100);
    putchar('\n');

    return 0;
}
```

```output
length: 13
upper:  HELLO, WORLD!
strtol: -42, stopped at 'abc'
sqrt(2) = 1.414214
3^4     = 81
0 7 49 73 58
```

## `qsort` and `bsearch` — generic sort and search

```c
int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);     /* avoid x - y overflow */
}

int arr[] = {3, 1, 4, 1, 5, 9, 2, 6};
qsort(arr, 8, sizeof(int), cmp_int);
int key = 4;
int *found = bsearch(&key, arr, 8, sizeof(int), cmp_int);
```

The `(x > y) - (x < y)` trick gives `-1`, `0`, or `1` without risk of overflow that `x - y` has.

## Try it

1. Write your own `safer_atoi(const char *s, int *out)` that returns 0 on success, -1 on failure, using `strtol`.
2. Use `qsort` to sort an array of strings (`char **`).
3. Generate a histogram of `rand() % 10` over 10 000 calls. Is it uniform?

## Notes from the author

- The standard library is much bigger than 1978-era C. Modern additions: `<stdint.h>`, `<stdbool.h>`, `<inttypes.h>`, `<complex.h>`, `<threads.h>` (C11), and `<stdatomic.h>` (C11).
- For string handling beyond ASCII, you'll want `<wchar.h>` for wide characters or external libraries (ICU, utf8proc). C's string functions are fundamentally byte-oriented and don't know about UTF-8.
- The "everything is in stdlib" property of C makes for small executables but verbose code. A typical Python one-liner takes 20 lines in C — but the C version runs 100x faster and uses 10x less memory.

🎉 You've finished the I/O chapter. Nine exercises follow that exercise these patterns: filters, file copies, custom printf, and more.

*Click **next →** for exercise 7-1.*
