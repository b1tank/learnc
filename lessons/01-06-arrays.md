---
id: 01-06-arrays
chapter: 1
label: "1.6"
title: Arrays
prev: 01-05-character-input-and-output
next: 01-07-functions
status: done
---

You now have ways to count things one at a time. But what if you want to count *each kind* of thing separately — every digit `0`–`9`, every letter, every byte value? You could declare ten `int` variables `nzero`, `none`, `ntwo`, …, but that scales like a stack of unread emails. C's answer is the **array**: a single name that holds many values of the same type, addressed by an integer index.

The starter below reads characters until EOF and reports how often each digit (`0` through `9`) appeared, plus a single bucket for everything else.

```c:starter
#include <stdio.h>

int main(void) {
    int c, i;
    int ndigit[10];   /* one counter per digit 0..9 */
    int nother = 0;

    for (i = 0; i < 10; ++i)
        ndigit[i] = 0;

    while ((c = getchar()) != EOF) {
        if (c >= '0' && c <= '9')
            ++ndigit[c - '0'];
        else
            ++nother;
    }

    printf("digits =");
    for (i = 0; i < 10; ++i)
        printf(" %d", ndigit[i]);
    printf("\nother  = %d\n", nother);

    return 0;
}
```

```output
```

Type something with a mix of digits and letters as input, then EOF. For example, `pi is 3.14159 and e is 2.71828` should print
`digits = 0 2 2 0 0 1 0 1 2 2` and `other = 23`.

## What's going on

- **Declaration `int ndigit[10];`** reserves storage for ten contiguous `int`s. They live next to each other in memory — that's not an implementation detail, it's part of the language guarantee, and it's why arrays interact so closely with pointers in chapter 5.
- **Index range is `0 .. N-1`.** `ndigit[0]` is the first element, `ndigit[9]` is the last. `ndigit[10]` is **out of bounds** — it reads or writes one element past the end of the array. The compiler will not stop you. The runtime will not stop you. You will silently corrupt whatever happens to live in memory next door, and the bug will surface ten thousand instructions later as a mysterious crash. This is undefined behaviour and you must train your fingers to write `i < N`, never `i <= N`, when looping over an array of size `N`.
- **Uninitialised array elements have garbage values.** The first `for` loop zeroes every slot before we touch it. If you forget, your "counters" start at whatever was in that memory before. A modern shortcut: `int ndigit[10] = {0};` — when an aggregate initialiser has at least one element, all the rest are filled with zero. We use the explicit loop here because that's the construct that generalises (you might want to seed with something other than zero).
- **`c - '0'`** turns the character `'5'` into the integer `5`. ASCII makes the ten digit characters sit at consecutive code points (`'0'` = 48, `'1'` = 49, …, `'9'` = 57), so subtracting `'0'` gives the digit's numeric value. This trick — characters are tiny integers and arithmetic on them is legal — comes up constantly.
- **The print loop is a mirror of the init loop.** Same shape, different body. When you see two `for` loops with the same header in C, the pattern is "set everything up, then read everything out."

## Modern note

C arrays *do not know their own length*. `sizeof ndigit / sizeof ndigit[0]` gives you `10` only when the array name is *still an array* in the current scope — pass it to a function and it decays to a pointer and the trick breaks. This is the single biggest source of buffer overflows in C-language software, and it's why every modern systems language (Rust, Go, Swift, Zig) carries length with the array.

If you're writing new C, lean on these habits:

- Always loop with `for (size_t i = 0; i < N; ++i)`. `size_t` is the unsigned type the standard library uses for sizes; mixing signed and unsigned in a comparison invites surprises.
- Compute `N` from a `#define` or `sizeof` *exactly once*, near the declaration. Repeating the literal `10` everywhere is how off-by-one bugs are born.
- C99 added Variable-Length Arrays (`int a[n];` where `n` isn't known at compile time). They're convenient but stack-allocated — never use them with an `n` that came from untrusted input.
- C11 added `_Static_assert(sizeof a / sizeof *a == 10, "size drift")` which catches size-mismatch bugs at compile time.

## Try it

1. Run the starter on `hello 1 2 3 4 5 6 7 8 9 0`. Verify the histogram.
2. Replace the zeroing loop with the brace-initialiser shortcut: `int ndigit[10] = {0};`. Run again — same output?
3. Print a *bar chart* instead of the raw counts: for each digit, print the digit, a tab, then `ndigit[i]` asterisks. Hint: an inner `for (int j = 0; j < ndigit[i]; ++j) putchar('*');`.
4. Off-by-one experiment: change the print loop to `i <= 10`. Most of the time the program will still appear to "work" — print an extra garbage value — but on some inputs you'll see strange numbers. That's UB in action.
5. Extend: track whitespace (`' '`, `'\t'`, `'\n'`) as a fourth bucket alongside digits and other. You'll need either a third counter or a small lookup array.
6. Bigger array: replace the digit-only histogram with one for every printable ASCII character (32–126). Hint: `int n[128] = {0};` and index by `c` directly.

## Notes from the author

- The "C arrays don't know their length" point is *the* difference between C and every higher-level language you've used. I gave it a full paragraph because it explains 90 % of CVEs in C programs from the last forty years. Worth its own callout when you revise.
- I picked the digit-histogram instead of K&R's word-length histogram because it's simpler to verify by eye and segues naturally into the bar-chart experiment. The word-length version is left as an exercise (it's literally K&R 1-13). If you'd rather make the lesson match the book chapter-and-verse, swap them.
- The `c - '0'` trick is small but rich. There's a whole future essay in "characters are integers; that's why `toupper(c)` is just `c & ~0x20`."
- I deliberately left `size_t` for the modern note rather than using it in the starter. Mixing it into the first array example invites questions about signed/unsigned conversion that aren't worth the detour at §1.6. When you write the §2.7 type-conversions lesson, point back here.

*Click **next →** to package this growing program into named, reusable functions.*
