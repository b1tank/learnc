---
id: 06-03-arrays-of-structures
chapter: 6
label: "6.3"
title: 'Arrays of Structures'
prev: 06-02-structures-and-functions
next: ex-6-1
status: done
---

An array of structs is laid out exactly like you'd expect: contiguous in memory, struct after struct. Each element is a full-sized struct, accessed by index.

The classic example is K&R's keyword counter:

```c:starter
#include <stdio.h>
#include <ctype.h>
#include <string.h>

struct key {
    const char *word;
    int   count;
};

static struct key keytab[] = {
    { "auto",     0 },
    { "break",    0 },
    { "case",     0 },
    { "char",     0 },
    { "const",    0 },
    { "continue", 0 },
    { "default",  0 },
    { "if",       0 },
    { "int",      0 },
    { "while",    0 },
};

#define NKEYS (sizeof keytab / sizeof keytab[0])

static int getword(char *w, int lim);
static int binsearch(const char *word, struct key tab[], int n);

int main(void) {
    char word[64];
    while (getword(word, sizeof word) != EOF) {
        if (isalpha((unsigned char)word[0])) {
            int idx = binsearch(word, keytab, NKEYS);
            if (idx >= 0) keytab[idx].count++;
        }
    }
    for (size_t i = 0; i < NKEYS; ++i)
        if (keytab[i].count > 0)
            printf("%4d %s\n", keytab[i].count, keytab[i].word);
    return 0;
}

static int getword(char *w, int lim) {
    int c;
    char *p = w;
    while (isspace(c = getchar()))
        ;
    if (c == EOF) return EOF;
    *p++ = c;
    if (!isalpha(c)) { *p = '\0'; return c; }
    while (--lim > 0) {
        c = getchar();
        if (!isalnum(c) && c != '_') { ungetc(c, stdin); break; }
        *p++ = c;
    }
    *p = '\0';
    return w[0];
}

static int binsearch(const char *word, struct key tab[], int n) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        int cond = strcmp(word, tab[mid].word);
        if (cond < 0)      hi = mid - 1;
        else if (cond > 0) lo = mid + 1;
        else               return mid;
    }
    return -1;
}
```

```output
(awaits C source on stdin — counts keywords)
```

## The size trick

```c
#define NKEYS (sizeof keytab / sizeof keytab[0])
```

This computes the array length *at compile time*. `sizeof keytab` is total bytes; `sizeof keytab[0]` is bytes per element; the quotient is the count.

The trick relies on `keytab` being a real array, not a pointer. If you pass `keytab` to a function and try the same expression there, you'll get nonsense — inside the function `keytab` decayed to a pointer, and `sizeof` returns the pointer size.

## Initialiser order

Members are initialised in declaration order — first member of struct gets the first value, etc. C99 added **designated initialisers** for clarity:

```c
struct key example = { .word = "if", .count = 0 };
```

Designated initialisers let you skip members (they get zero-initialised) and reorder. Highly recommended for structs with more than a few fields — they're self-documenting.

## Try it

1. Add words like `for`, `do`, `else`, `void` to the table (keep it sorted!) and verify the search finds them.
2. Switch to designated initialisers and check the output is unchanged.

## Notes from the author

- `struct key keytab[]` (no size) lets the compiler count the initialisers. This is the safe-and-DRY way to declare a static table — adding rows automatically updates the size.
- Binary search requires the table to be sorted. If you add words out of order, the search fails silently. A common discipline: sort the table at startup with `qsort`, or write a unit test that asserts sortedness.
- Modern C codebases use `struct { ... } table[]` as the dictionary type for everything from CLI flags to MIME types. It's the closest C has to a built-in literal map.

*Click **next →** for pointers to structs.*
