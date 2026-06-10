---
id: 01-09-character-arrays
chapter: 1
label: "1.9"
title: Character Arrays
prev: 01-08-arguments-call-by-value
next: ex-1-16
status: done
---

A C string is not a distinct type - it's a convention: a `char` array whose end is marked by a [null terminator](https://en.wikipedia.org/wiki/Null-terminated_string), the byte `'\0'` (value 0). Every standard string function (`strlen`, `strcpy`, `printf`'s `%s`) relies on that zero byte to know where the text stops. There is no separate length field; the data *is* the bytes plus the sentinel.

## The hidden terminator

The literal `"hi"` is two visible characters but occupies **three** bytes - the compiler appends `'\0'` automatically. Walking the array byte by byte reveals it:

```c:run a string is bytes plus a zero
#include <stdio.h>

int main(void) {
    char s[] = "hi";
    printf("sizeof(s) = %zu\n", sizeof(s));   /* 3: 'h', 'i', '\0' */
    for (int i = 0; ; i++) {
        printf("s[%d] = %d", i, s[i]);
        if (s[i]) printf(" ('%c')\n", s[i]);
        else { printf(" (terminator)\n"); break; }
    }
    return 0;
}
```

```output
sizeof(s) = 3
s[0] = 104 ('h')
s[1] = 105 ('i')
s[2] = 0 (terminator)
```

The numbers 104 and 105 are the [ASCII](https://en.wikipedia.org/wiki/ASCII) codes for `h` and `i`. A character constant like `'h'` is just a small integer; storing text is storing numbers.

## Length means "scan to the zero"

Because the length isn't stored, computing it is an O(n) walk to the terminator. This is K&R's `strlen` reimplemented - and the reason `strlen` on attacker-controlled data without a guaranteed `'\0'` is a real-world security bug:

```c:run reimplementing strlen
#include <stdio.h>

int my_strlen(char s[]) {
    int i = 0;
    while (s[i] != '\0')   /* stop at the terminator */
        ++i;
    return i;              /* count does NOT include the '\0' */
}

int main(void) {
    printf("%d\n", my_strlen("ground up"));
    printf("%d\n", my_strlen(""));     /* empty string: first byte is already '\0' */
    return 0;
}
```

```output
9
0
```

Note `char s[]` as a parameter is really `char *s` - the array decayed to a pointer (see [Call by Value](lesson.html?id=01-08-arguments-call-by-value)), so `my_strlen` reads the caller's bytes directly and you never copy the string. Forgetting the terminator - or overrunning a fixed buffer while copying - is the root of a whole family of [buffer-overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow) vulnerabilities.

## Go deeper
- [Null-terminated string](https://en.wikipedia.org/wiki/Null-terminated_string) - the convention and its trade-offs
- [`<string.h>`](https://en.cppreference.com/w/c/string/byte) - the standard library that depends on `'\0'`
- [ASCII](https://en.wikipedia.org/wiki/ASCII) - character-to-number mapping
- [String handling pitfalls](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow) - why C strings are a security minefield
