---
id: 07-07-line-input-and-output
chapter: 7
label: "7.7"
title: 'Line Input and Output'
prev: 07-06-error-handling-stderr-and-exit
next: ex-7-6
status: done
---

Most text is naturally organized into **lines**, so the library offers line-at-a-time I/O on top of the character primitives. `fgets(buf, size, stream)` reads up to one line — it stops at a newline (which it *keeps* in the buffer) or after `size-1` characters, whichever comes first, and always null-terminates. `fputs(s, stream)` writes a string. The single most important property of `fgets` is that you tell it the buffer size, so unlike its dangerous predecessor `gets`, it **cannot overflow your buffer**. Reading a whole line and then parsing it is the safe, recommended alternative to feeding `scanf` directly from a stream.

## Read lines, track the longest

```c:run find the longest input line
#include <stdio.h>
#include <string.h>
#define MAXLINE 1000

int main(void) {
    char line[MAXLINE], longest[MAXLINE];
    int max = 0, count = 0;
    longest[0] = '\0';
    while (fgets(line, MAXLINE, stdin) != NULL) {  /* NULL at end of input */
        int len = strlen(line);
        count++;
        if (len > max) { max = len; strcpy(longest, line); }
    }
    printf("read %d lines; longest (%d chars): %s", count, max, longest);
    if (max && longest[max-1] != '\n') printf("\n");
    return 0;
}
```

```stdin
hi
a longer line here
bye
```

```output
read 3 lines; longest (19 chars): a longer line here
```

`fgets` returns the buffer pointer on success and `NULL` at end-of-input (or error), which is exactly the loop condition you want. Each line it returns *includes the trailing `\n`* (here the 19 counts the 18 visible characters plus the newline), so when you print the stored line you often don't add your own `\n` — that's why the program checks whether the last character is already a newline before adding one. `strlen` measures the line and `strcpy` saves a copy of the longest so far.

## fgets vs gets, and the newline details

The reason `fgets` exists is that its ancestor [`gets`](https://en.wikipedia.org/wiki/Gets_(C)) had no size argument: it read until newline no matter how long, happily writing past the end of your buffer. That single design flaw caused so many [buffer-overflow exploits](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow) — including the 1988 Morris Worm — that `gets` was formally **removed from the C standard in C11**. Never use it; `fgets` is the bounded replacement. Two practical wrinkles follow from `fgets` keeping the newline. First, you often want to strip it: `line[strcspn(line, "\n")] = '\0';` trims the trailing newline cleanly. Second, if a line is longer than your buffer, `fgets` returns just the first `size-1` characters *without* a newline, and the rest waits for the next call — so a missing trailing newline can mean "buffer too small," which robust code detects and handles (e.g. by reading in a loop or using POSIX [`getline`](https://man7.org/linux/man-pages/man3/getline.3.html), which allocates a buffer of whatever size the line needs). On output, `fputs(s, stream)` writes a string *without* adding a newline (the opposite of `puts`, which appends one). The takeaway: prefer line-oriented, size-bounded input, then parse the line in memory — it's both safer and easier to reason about than character- or `scanf`-driven stream parsing.

## Go deeper
- [`fgets` / `fputs`](https://en.cppreference.com/w/c/io/fgets) — bounded line I/O
- [`gets` (removed)](https://en.wikipedia.org/wiki/Gets_(C)) — the function too dangerous to keep
- [`getline(3)`](https://man7.org/linux/man-pages/man3/getline.3.html) — read an arbitrarily long line
- [`strcspn`](https://en.cppreference.com/w/c/string/byte/strcspn) — a tidy way to trim the newline
