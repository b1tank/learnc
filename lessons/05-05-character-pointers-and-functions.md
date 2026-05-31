---
id: 05-05-character-pointers-and-functions
chapter: 5
label: "5.5"
title: Character Pointers and Functions
prev: 05-04-address-arithmetic
next: ex-5-3
status: done
---

A C **string** is not a distinct type — it's just an array of `char` ending in a `'\0'` (the null terminator). A *string literal* like `"ground up"` is stored as such an array somewhere in memory, and using it in an expression gives a `char *` pointing at its first character. This is why string functions take `char *` arguments and walk the bytes with pointer arithmetic until they hit the `'\0'`. Writing your own `strcpy` and `strlen` reveals the idiom that pervades C: *march a pointer down the string until the terminator*.

## Copying and measuring with bare pointers

```c:run hand-written strcpy and strlen
#include <stdio.h>

void mystrcpy(char *dst, const char *src) {
    while ((*dst++ = *src++))     /* copy each char, INCLUDING the '\0' */
        ;                         /* the assignment's value is the char; */
}                                 /* it becomes 0 (false) at the terminator */

int mystrlen(const char *s) {
    const char *p = s;
    while (*p) p++;               /* advance until the '\0' */
    return (int)(p - s);          /* distance walked = length */
}

int main(void) {
    char buf[32];
    mystrcpy(buf, "ground up");
    printf("copied: %s (len %d)\n", buf, mystrlen(buf));
    return 0;
}
```

```output
copied: ground up (len 9)
```

`*dst++ = *src++` is one of C's densest idioms: copy the char `*src` to `*dst`, *then* advance both pointers (post-increment), and the loop continues while the copied value is non-zero. When `src` reaches the `'\0'`, that zero is copied (terminating `dst` correctly) and the assignment yields 0, ending the loop. `mystrlen` shows the pointer-difference trick from the previous section: walk a pointer to the terminator, then subtract the start — the gap *is* the length (9 here; the `'\0'` isn't counted).

## Where strings live, and the buffer-overflow trap

A crucial distinction: `char *s = "hi";` makes `s` point at a **read-only** string literal (typically in the `.rodata` segment); attempting `s[0] = 'H'` is undefined behavior and usually crashes. By contrast, `char a[] = "hi";` *copies* the literal into a writable array you own — that you may modify. The other ever-present danger is size: `mystrcpy` and the standard `strcpy` write until the source's `'\0'`, with **no idea** how big `dst` is. If the destination buffer is too small, you scribble past it — the classic [buffer overflow](https://en.wikipedia.org/wiki/Buffer_overflow), the root of countless security exploits. That's why modern code prefers bounded variants like `strncpy`/`snprintf` (or `strlcpy` where available) that take a maximum length. Always ensure the destination has room for *every source character plus the terminator*.

## Go deeper
- [Strings in C](https://en.cppreference.com/w/c/string/byte) — the null-terminated convention
- [String literals](https://en.cppreference.com/w/c/language/string_literal) — storage and read-only-ness
- [Buffer overflow](https://en.wikipedia.org/wiki/Buffer_overflow) — why unbounded copies are dangerous
- [`strcpy`/`strlen` reference](https://en.cppreference.com/w/c/string/byte/strcpy) — the standard versions
