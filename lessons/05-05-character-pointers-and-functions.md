---
id: 05-05-character-pointers-and-functions
chapter: 5
label: "5.5"
title: Character Pointers and Functions
prev: 05-04-address-arithmetic
next: ex-5-3
status: done
---

A **string** in C is a sequence of `char` values terminated by a `'\0'` byte. A "string variable" can be either:

- A `char` array with the contents copied in: `char a[] = "hello";` — 6 bytes of mutable storage.
- A `char *` pointing to a string literal: `char *p = "hello";` — the pointer is in your stack/heap, the literal lives in **read-only** memory.

```c
char a[] = "hello";    /* mutable: a[0] = 'H' is fine */
char *p  = "hello";    /* read-only: *p = 'H' is undefined behaviour, may segfault */
```

C99 made this a strict rule: string literals have type `const char *` (some compilers warn if you assign to non-const). Use `const char *p = "hello";` to make the contract explicit.

## A classic: `strcpy`

```c:starter
#include <stdio.h>

void my_strcpy(char *s, const char *t);

int main(void) {
    char buf[20];
    my_strcpy(buf, "hello pointer world");
    printf("[%s]\n", buf);
    return 0;
}

/* the K&R idiomatic pointer-walking version */
void my_strcpy(char *s, const char *t) {
    while ((*s++ = *t++) != '\0')
        ;
}
```

```output
[hello pointer world]
```

The compact form `while ((*s++ = *t++) != '\0')` does four things per iteration:

1. Read the byte at `*t`.
2. Write it to `*s`.
3. Advance both pointers (`s++`, `t++` post-increment).
4. Continue while the byte was non-zero.

Operator precedence subtlety: `*s++` parses as `*(s++)`, which reads `*s` then advances `s`. The whole assignment `*s = *t` produces the value written; the `!= '\0'` tests that copied value.

The even more compact `while (*s++ = *t++);` (no explicit `!= '\0'`) is K&R style — the loop ends when the assigned value is `0`, which is exactly the null terminator. Modern compilers and linters often want the explicit comparison; add it for clarity.

## `strlen`, `strcmp` — same idea

```c
size_t my_strlen(const char *s) {
    const char *start = s;
    while (*s) ++s;
    return s - start;
}

int my_strcmp(const char *s, const char *t) {
    while (*s == *t) {
        if (*s == '\0') return 0;
        ++s; ++t;
    }
    return (unsigned char)*s - (unsigned char)*t;
}
```

Each is a tight pointer-walk over two strings. The `(unsigned char)` cast in `strcmp` matters: on systems where `char` is signed, a negative-byte character would produce wrong comparison results.

## Why character pointers vs char arrays

| Form              | Memory               | Mutable? | Cost           |
|-------------------|----------------------|----------|----------------|
| `char a[] = "x";` | Stack copy of literal| Yes      | One-time copy  |
| `char *p = "x";`  | Pointer to literal   | No       | No copy        |
| `char *p = malloc(...); strcpy(p, "x");` | Heap | Yes  | malloc + copy  |

Pick the form that matches what you'll do:
- Read-only string handed around → `const char *`.
- Mutable in-place edit → array or `malloc`'d buffer.
- Build at runtime from pieces → `malloc`'d buffer.

## Modern note

- `strncpy`, `strncat`, `snprintf` exist to bound writes. Plain `strcpy` is a buffer-overflow magnet — every C security advisory mentions one.
- C11 added `strcpy_s` and friends (Annex K) — bounds-checked variants. They're optional, sparsely implemented (glibc rejects them), and Microsoft's are different from the standard. Most modern code uses `snprintf` or wrote its own bounded copy.
- For C-like high-level work, consider hand-rolling a `struct slice { char *p; size_t len; };` instead of relying on `\0`-terminated convention. Many real codebases (sd-bus, OpenSSL's BIO) do this for binary data.

## Try it

1. Implement `char *my_strchr(const char *s, int c)` that finds the first `c` in `s` and returns a pointer (or `NULL`). Compare with library `strchr`.
2. Try `*p = 'H'` after `char *p = "hello";`. Run it under AddressSanitizer or in a debug build — you'll see a SIGSEGV from writing to `.rodata`.
3. Use `printf("%zu\n", strlen("hello"));` and notice that `strlen` returns `size_t`, which `%zu` prints correctly. Using `%d` is a portability bug on 64-bit.

## Notes from the author

- The "pointer-walk loop body" idiom (`while (*s++ = *t++)`) is C at its most dense. It's beautiful when you understand it, opaque when you don't. Modern style often prefers the explicit form for readability; performance is identical post-optimisation.
- Null-terminated strings are a 1970s design choice that the world is still paying for. Every buffer overflow, every "off by one for the terminator", every "`strlen` is O(n)" surprise traces back to it. We're stuck with them for C interop forever.
- Always treat string literals as `const char *`. Modern compilers warn; don't silence the warning. Mutating a literal is one of the easiest ways to crash a program in the wild.

*Click **next →** for arrays of pointers and pointers to pointers.*
