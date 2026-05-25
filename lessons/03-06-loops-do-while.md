---
id: 03-06-loops-do-while
chapter: 3
label: "3.6"
title: Loops — Do-While
prev: ex-3-3
next: ex-3-4
status: done
---

`do`/`while` is the **bottom-tested** loop:

```c
do
    statement
while (expression);
```

The body runs first, then the condition is tested. The body therefore runs **at least once**, even if the condition starts out false.

## When to reach for it

Most loops want a top-tested form. The cases where bottom-testing wins are the ones where the work *has to happen before* you know whether to continue:

- Reading at least one character before deciding to stop.
- Prompting a user for input and re-prompting on bad answers.
- Building a result whose final digit can only be computed during the build (like `itoa`).

The classic example is integer-to-string conversion:

```c:starter
#include <stdio.h>
#include <string.h>

void itoa(int n, char s[]);
void reverse(char s[]);

int main(void) {
    char buf[32];
    itoa(0,     buf); printf("itoa(0)     = %s\n", buf);
    itoa(42,    buf); printf("itoa(42)    = %s\n", buf);
    itoa(-17,   buf); printf("itoa(-17)   = %s\n", buf);
    itoa(12345, buf); printf("itoa(12345) = %s\n", buf);
    return 0;
}
```

## Solution sketch

```c
void itoa(int n, char s[]) {
    int sign = n;
    if (n < 0) n = -n;

    int i = 0;
    do {                         /* must run at least once — n==0 still produces "0" */
        s[i++] = n % 10 + '0';
    } while ((n /= 10) > 0);

    if (sign < 0)
        s[i++] = '-';

    s[i] = '\0';
    reverse(s);
}

void reverse(char s[]) {
    int i = 0, j = (int)strlen(s) - 1;
    while (i < j) {
        char t = s[i]; s[i] = s[j]; s[j] = t;
        ++i; --j;
    }
}
```

```output
itoa(0)     = 0
itoa(42)    = 42
itoa(-17)   = -17
itoa(12345) = 12345
```

Why `do`/`while`? Because for `n == 0`, the body still needs to run once to emit the digit `'0'`. A top-tested `while (n > 0)` would skip the body entirely, leaving the buffer empty.

## Don't forget the semicolon

```c
do { ... } while (cond);
```

The `;` after the `while (cond)` is part of the syntax. Missing it is a common typo, especially if you're translating from a top-tested loop.

## Modern note

`do`/`while` is the **least-used** of the three loop forms in real C code. A modern static analyser will sometimes flag `while(0)` as "did you mean a `do`/`while`?" because the `do { ... } while (0)` pattern is *exactly* the trick that makes a multi-statement macro safe (see chapter 4 on the preprocessor).

```c
#define INIT(x)  do { (x)->n = 0; (x)->s = NULL; } while (0)
```

The macro can be used as a statement (with semicolon) without breaking nearby `if`/`else` structures. It's the only standard idiom that *requires* `do`/`while (0)`.

## Try it

1. Rewrite the `itoa` above with a top-tested `while`. Notice you need an extra special case for `n == 0` (write the digit explicitly before entering the loop).
2. Make a prompt loop: `do { print prompt; read input; } while (input is invalid);`. Bottom-tested fits the workflow naturally.
3. Replace `do { ... } while (cond);` with `while (1) { ... if (!cond) break; }`. Same behaviour, more verbose — but it makes the exit condition explicit.

## Notes from the author

- `do`/`while` is a niche tool. If you find yourself reaching for it often, sit back and ask whether `for` or `while` with a leading "first iteration" line wouldn't read better.
- The `itoa` example is interesting because the buffer is built in reverse — least-significant digit first. The final `reverse(s)` is essential. A natural alternative is to write into the buffer from the *high index downward*, eliminating the reverse step — try that as an extension.
- The `do { ... } while (0)` macro idiom is a great reason to know `do`/`while` exists even if you never write a real bottom-tested loop. It's the only safe way to write a multi-statement macro that compiles cleanly inside an `if`/`else` chain.

*Click **next →** for `break` and `continue`.*
