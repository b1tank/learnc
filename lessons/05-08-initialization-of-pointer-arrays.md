---
id: 05-08-initialization-of-pointer-arrays
chapter: 5
label: "5.8"
title: Initialization of Pointer Arrays
prev: ex-5-9
next: 05-09-pointers-vs-multi-dimensional-arrays
status: done
---

You can initialise an array of pointers in the declaration, just like any other array — but the initialisers are themselves pointers (typically string literals or `NULL`).

## The classic month-name table

```c:starter
#include <stdio.h>

const char *month_name(int n);

int main(void) {
    for (int i = 0; i <= 13; ++i)
        printf("%2d: %s\n", i, month_name(i));
    return 0;
}

const char *month_name(int n) {
    static const char *months[] = {
        "(invalid)",       /* index 0 */
        "January",  "February",  "March",
        "April",    "May",       "June",
        "July",     "August",    "September",
        "October",  "November",  "December"
    };
    if (n < 1 || n > 12)
        return months[0];
    return months[n];
}
```

```output
 0: (invalid)
 1: January
 2: February
 3: March
 4: April
 5: May
 6: June
 7: July
 8: August
 9: September
10: October
11: November
12: December
13: (invalid)
```

A few things going on:

1. **`static`** at function scope (§4.6): the table is built **once**, before main is entered, and persists across calls. No per-call setup cost.
2. **`const char *`**: each entry is a pointer to a string literal in `.rodata`. The pointers themselves live in the (static, immutable) `months` array.
3. **Bounds-check at the entry**: out-of-range inputs map to `months[0]` ("(invalid)"). The function never crashes on bad input.

## Why pointers, not a 2D char array

If you wrote it as `static const char months[13][10]`, every row would have to be at least 10 bytes (the longest string fits + null). Total: `130` bytes, with padding bytes wasting space.

The pointer version: `13 * sizeof(char *)` = 104 bytes for the table, plus the literals themselves (~80 bytes total). Slightly more memory total in this small case; for highly variable-length rows the savings would be larger. The real benefit is **clarity of intent**: each entry is a string, not a fixed-width slot.

## Initialiser shorthand

```c
const char *errors[] = {
    [EIO]     = "I/O error",
    [ENOMEM]  = "out of memory",
    [EINVAL]  = "invalid argument",
};
```

C99 **designated initialisers** let you initialise by index. Above, indices `EIO`, `ENOMEM`, `EINVAL` (errno macros) get specific entries; everything else is `NULL`. Beautiful for sparse tables — exactly what you want for `errno` strings.

## Try it

1. Make a `weekday_name(int n)` returning Sunday through Saturday. Defensive handling of out-of-range input.
2. Build a 2D pointer table: `static const char *grid[3][3] = { ... };` and fill in chessboard positions or tic-tac-toe state.
3. Use designated initialisers for an enum-keyed lookup table. Notice how the file reads like a switch statement.

## Notes from the author

- The "lookup table built at compile time" pattern is everywhere in real C: month names, day names, HTTP status text, errno strings, opcode mnemonics. Initialise them as `static const`; the linker places them in `.rodata` and there's literally no runtime setup cost.
- Designated initialisers in C99 are quietly one of the language's best additions. They make tables self-documenting (`[EIO] = "..."` says "this entry corresponds to error code `EIO`") and reorderable without breaking the indices.
- Returning `const char *` from a getter is the C idiom for "you don't own this string, don't free it, don't mutate it". The caller can `printf("%s", month_name(3))` and never has to think about lifetimes.

*Click **next →** for the subtle distinction between pointers and multi-dim arrays.*
