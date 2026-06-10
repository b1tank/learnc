---
id: 07-08-miscellaneous-functions
chapter: 7
label: "7.8"
title: 'Miscellaneous Functions'
prev: ex-7-8
next: ex-7-9
status: done
---

The standard library is more than I/O. A handful of headers cover the everyday chores of almost every C program: `<string.h>` for copying, comparing, and searching memory and text; `<ctype.h>` for classifying and converting characters; `<stdlib.h>` for converting strings to numbers, allocating memory, sorting, and random numbers; and `<math.h>` for floating-point math. Knowing what's already written for you - correct, portable, and often hand-optimized - is what keeps you from re-implementing (and mis-implementing) the basics.

## A sampler across the headers

```c:run string, character, and conversion helpers
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

int main(void) {
    printf("atoi(\"42abc\")   = %d\n", atoi("42abc"));      /* parse leading int */
    printf("atof(\"3.14\")    = %.2f\n", atof("3.14"));     /* parse a double    */
    printf("strlen(\"hello\") = %zu\n", strlen("hello"));   /* length, no '\0'   */
    printf("strcmp(ab,ac)   = %d\n", strcmp("ab","ac") < 0 ? -1 : 1);
    printf("toupper('c')    = %c\n", toupper('c'));         /* classify/convert  */
    printf("isdigit('7')    = %d\n", isdigit('7') ? 1 : 0);
    return 0;
}
```

```output
atoi("42abc")   = 42
atof("3.14")    = 3.14
strlen("hello") = 5
strcmp(ab,ac)   = -1
toupper('c')    = C
isdigit('7')    = 1
```

`atoi`/`atof` (in `<stdlib.h>`) parse a number from the front of a string, stopping at the first non-numeric character - `"42abc"` yields `42`. `strlen` counts characters *up to but not including* the `'\0'` terminator (so `"hello"` is 5, even though the array holds 6 bytes). `strcmp` returns negative, zero, or positive as its first argument sorts before, equal to, or after the second - here `"ab" < "ac"` so it's negative (shown normalized to -1). The `<ctype.h>` functions classify (`isdigit`, `isalpha`, `isspace`) and convert (`toupper`, `tolower`) single characters.

## What's in the toolbox - and the upgrades worth knowing

A quick map of the most-used pieces. From **`<string.h>`**: `strcpy`/`strncpy` (copy), `strcat`/`strncat` (concatenate), `strcmp`/`strncmp` (compare), `strchr`/`strstr` (search for a character/substring), and the raw-memory cousins `memcpy`, `memmove` (overlap-safe), and `memset`. From **`<stdlib.h>`**: `malloc`/`calloc`/`realloc`/`free` (heap memory), [`qsort`](https://en.cppreference.com/w/c/algorithm/qsort) and `bsearch` (generic sort/search driven by a comparison-function pointer - a real-world use of the [function pointers](05-11-pointers-to-functions.md) from chapter 5), `rand`/`srand` (pseudo-random numbers), and `abs`/`labs`. From **`<math.h>`**: `sqrt`, `pow`, `sin`/`cos`, `floor`/`ceil`, `fabs` (link with `-lm` on Unix). Two cautions worth internalizing. The `atoi`/`atof` family **cannot report errors** - they return 0 for unparseable input, indistinguishable from a real 0 - so production code prefers [`strtol`/`strtod`](https://en.cppreference.com/w/c/string/byte/strtol), which tell you exactly where parsing stopped and flag overflow. And the unbounded `strcpy`/`strcat` overflow if the destination is too small (the same hazard as `gets`); reach for the size-bounded `strncpy`/`snprintf` when handling untrusted lengths. The meta-lesson of this chapter: **read the library before writing your own** - `<string.h>` and friends are battle-tested, portable, and usually faster than anything you'd hand-roll.

## Go deeper
- [`<string.h>`](https://en.cppreference.com/w/c/string/byte) - string and memory functions
- [`<ctype.h>`](https://en.cppreference.com/w/c/string/byte#Character_classification) - character classification
- [`<stdlib.h>`](https://en.cppreference.com/w/c/header/stdlib) - conversions, memory, `qsort`, random
- [`qsort` / `bsearch`](https://en.cppreference.com/w/c/algorithm/qsort) - generic sort and search
