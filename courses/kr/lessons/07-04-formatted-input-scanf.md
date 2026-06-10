---
id: 07-04-formatted-input-scanf
chapter: 7
label: "7.4"
title: 'Formatted Input - Scanf'
prev: ex-7-3
next: ex-7-4
status: done
---

`scanf` is `printf`'s mirror image: it reads characters from `stdin` and *parses* them into typed variables according to a format string. Where `printf` turns values into text, `scanf` turns text into values. Each conversion like `%d` skips leading whitespace, reads as many characters as match (e.g. digits for `%d`), converts them, and stores the result through a **pointer** you pass - which is why `scanf` arguments are addresses (`&day`), not values. Its critical and easily-ignored feature is the **return value**: the number of items successfully converted, which is how you detect bad input.

## Parsing fields from a line

```c:run read a day, a month name, and a year
#include <stdio.h>

int main(void) {
    int day, year;
    char mon[20];
    int n = scanf("%d %s %d", &day, mon, &year);   /* &day: store THROUGH a pointer */
    printf("matched %d fields: day=%d mon=%s year=%d\n", n, day, mon, year);
    return 0;
}
```

```stdin
25 Dec 1988
```

```output
matched 3 fields: day=25 mon=Dec year=1988
```

`%d` skips whitespace then reads an integer; `%s` skips whitespace then reads a **non-whitespace word** (stopping at the next space/newline) and appends a `'\0'`. Note `mon` is passed *without* `&` - an array name already decays to a pointer to its first element, whereas `day` and `year` are plain `int`s and need `&` to give `scanf` their addresses. The return value `n` is 3 because all three conversions succeeded; that number is your only reliable signal of success.

## Why scanf is treacherous - check the return, bound the width

`scanf` is convenient but notoriously error-prone, and the failures are silent. **Always check the return value**: if the user types `abc` where `%d` expects a number, the conversion fails, `n` comes back less than expected, and - crucially - the offending characters are *left in the input buffer*, so a naive retry loops forever on the same bad data. The worst hazard is `%s`: by default it reads an unbounded word and will **overflow** your buffer if the input is longer than `mon[20]`, a classic [buffer overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow). The defense is a *field width*: `%19s` reads at most 19 characters into a 20-byte buffer (leaving room for `'\0'`). Other traps: mixing `scanf("%d")` with line-reading functions tangles the leftover newline; and a literal space in the format matches *any amount* of whitespace including none. For these reasons seasoned C programmers often avoid `scanf` for interactive input entirely, preferring to read a whole line with [`fgets`](07-07-line-input-and-output.md) and then parse it with [`sscanf`](https://en.cppreference.com/w/c/io/fscanf) or `strtol`/`strtod` - that way a parse error can't corrupt the input stream and you control buffering explicitly.

## Go deeper
- [`scanf` format spec](https://en.cppreference.com/w/c/io/fscanf) - conversions and the return value
- [`scanf(3)`](https://man7.org/linux/man-pages/man3/scanf.3.html) - full reference
- [`strtol` / `strtod`](https://en.cppreference.com/w/c/string/byte/strtol) - safer numeric parsing
- [Buffer overflow](https://en.wikipedia.org/wiki/Buffer_overflow) - why unbounded `%s` is dangerous
