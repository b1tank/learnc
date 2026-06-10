---
id: 12-pointers-clarifications
chapter: 5
label: "5.3"
title: Clarifications on the pointer concepts
prev: 11-pointer-arithmetic
next: 13-malloc-first-encounter
status: draft
source:
  videoId: msGzuneFpDU
  url: https://www.youtube.com/watch?v=msGzuneFpDU
---

> **Source video.** [Let's Learn C - lesson 11](https://www.youtube.com/watch?v=msGzuneFpDU) by Salvatore Sanfilippo (antirez).

## TL;DR

Three small confusions trip everyone up the first time: (1) the **type** of a pointer decides how many bytes a dereference reads, not the underlying memory; (2) the character `'0'` is not the byte `\0` - they have values 48 and 0; (3) when you want to alternate between two buffers, swap *pointers*, don't copy data.

## Same address, two pointers, different reads `[01:27]`

If you take a `char` array and aim a `short *` at the same address (with a cast, because the compiler warns otherwise), reading through `char*` gives you one byte at a time, while reading through `short*` gives you two bytes at a time interpreted as a 16-bit integer. The memory hasn't changed - your *view* of it has. This is the whole point of pointer types: they tell the compiler the stride and the decoding rule.

## Why two bytes `{0x01, 0x01}` print as 257 `[04:42 → 10:05]`

This is just place-value arithmetic in base 256. On a little-endian machine (x86, ARM in normal mode, WebAssembly) the byte at the lower address is the least significant. So `{0x01, 0x01}` as a `short` is `1 + 1·256 = 257`; `{0x02, 0x02}` is `2 + 2·256 = 514`. Nothing C-specific is happening - it's how every base works.

Salvatore confirms the values straight from a Python prompt, reading each byte pair as one hexadecimal number:

```
python3 -c "print(0x0101, 0x0202)"
```

```output
257 514
```

Reading the two bytes as `0x0101` and `0x0202` gives back exactly the `257` and `514` the C program printed.

## `'0'` is not `'\0'` `[11:53 → 13:36]`

A loop like `while (*p) p++;` stops when the byte equals zero. The ASCII character `'0'` has value **48**, not 0, so a string `"hello00"` does *not* stop early - those `'0'`s are perfectly ordinary non-zero bytes. To get a real terminator inside a literal you write `\0` (an escape, value 0). It looks similar on the screen; the integer values are completely different.

```c:run pointer-clarifications
#include <stdio.h>

int main(void) {
    printf("'0' as int : %d\n", '0');
    printf("'\\0' as int: %d\n", '\0');
    printf("equal?       %s\n", ('0' == '\0') ? "yes" : "no");
    return 0;
}
```

```output
'0' as int : 48
'\0' as int: 0
equal?       no
```

## Prefixed-length strings `[14:14 → 17:27]`

Once you accept that `\0` is just a convention, you can pick another one. Reserve the first byte of the buffer for the length, then read exactly that many bytes - no terminator needed. The cost is the obvious one: a single length byte caps you at 255 characters, two bytes at 65 535, and so on. (Pascal did this. Redis does a fancier version of it for its strings.)

```c:run prefixed-length
#include <stdio.h>

int main(void) {
    /* First byte = length; the following bytes are the characters. */
    char s[] = { 5, 'h', 'e', 'l', 'l', 'o', '!', '?' };
    int len = s[0];
    for (int j = 1; j <= len; j++) putchar(s[j]);
    putchar('\n');
    return 0;
}
```

```output
hello
```

The trailing `'!','?'` are never read: the length byte, not a terminator, decides where the string ends.

## Swap pointers, don't copy buffers `[19:37 → 21:08]`

In the Game-of-Life program from the previous lesson, the "compute new state, then make it the current state" step was duplicated to avoid copying. With pointers you can collapse it: keep two pointers `old` and `new`, compute from `old` into `new`, then swap them with a temporary. The arrays never move; only the labels do. This is a tiny example of the bigger lesson - pointers let your *names* migrate over memory cheaply.

```c:run pointer-swap
#include <stdio.h>

int main(void) {
    int a[3] = {1, 2, 3};
    int b[3] = {9, 9, 9};
    int *old = a, *new = b;

    for (int step = 0; step < 2; step++) {
        for (int i = 0; i < 3; i++) new[i] = old[i] + 1;
        int *tmp = old; old = new; new = tmp;
    }
    /* After two swaps, `old` points at the latest result. */
    printf("%d %d %d\n", old[0], old[1], old[2]);
    return 0;
}
```

```output
3 4 5
```

## `const char *` is not `char * const`

These two declarations read almost the same but constrain different things. `const char *p` is a *pointer to const* - you may move `p`, but you may not write through it. `char * const q` is a *const pointer* - you may write through `q`, but you may not move it. Position of `const` relative to the `*` is what decides.

```c:run
#include <stdio.h>

int main(void) {
    char buf[] = "cat";
    const char *p = buf;   /* pointer to const char: can move p, can't write *p */
    char * const q = buf;  /* const pointer:         can write *q, can't move q */
    p++;                   /* OK: move the pointer */
    *q = 'b';              /* OK: write through the pointer -> "bat" */
    printf("p points at '%c'\n", *p);
    printf("buf is now \"%s\"\n", buf);
    return 0;
}
```

```output
p points at 'a'
buf is now "bat"
```

Cross the lines and the compiler stops you. Writing through the pointer-to-const:

```c
*p = 'b';   /* p is const char * */
```

```output
error: assignment of read-only location ‘*p’
```

Moving the const pointer:

```c
q++;        /* q is char * const */
```

```output
error: increment of read-only variable ‘q’
```

## NULL is the address zero

`NULL` is just a pointer whose value is the integer `0` - a deliberately invalid address that means "points at nothing". You use it as a sentinel: a function returns `NULL` to signal failure, and you check for it before dereferencing.

```c:run
#include <stdio.h>
#include <stddef.h>

int main(void) {
    int *p = NULL;
    printf("NULL as a number: %ld\n", (long)p);
    printf("p == 0 ?          %s\n", (p == 0) ? "yes" : "no");
    return 0;
}
```

```output
NULL as a number: 0
p == 0 ?          yes
```

Dereferencing it is a different story. `*p` asks the CPU to read from address `0`, which the operating system has deliberately left unmapped, so the program is killed on the spot - on Linux you see `Segmentation fault (core dumped)` and an exit status of `139`. That crash is a feature: it turns a silent logic bug into a loud, immediate stop. Always check a pointer against `NULL` before you follow it.

## Pointers to pointers

A pointer is itself a variable sitting in memory, so it has its own address - and you can store that address in another pointer. `int **pp` is a pointer to an `int *`. Each `*` peels off one level: `*pp` is the inner pointer, `**pp` is the `int` at the very bottom.

```c:run
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;     /* p holds the address of x   */
    int **pp = &p;   /* pp holds the address of p  */
    printf("*p   = %d\n", *p);
    printf("**pp = %d\n", **pp);
    **pp = 99;       /* reach through pp -> p -> x */
    printf("x    = %d\n", x);
    return 0;
}
```

```output
*p   = 42
**pp = 42
x    = 99
```

The last write proves the chain is real: assigning through `**pp` changes `x` itself. This is how a function gets to modify a *caller's pointer* - it takes the pointer's address.

## Arrays decay to pointers

The "equivalence between array names and pointers" antirez keeps invoking has one sharp edge: in almost every expression an array name is converted ("decays") into a pointer to its first element. That is why `v` and `&v[0]` are equal and why you can subscript a pointer. But the array is *not* a pointer - `sizeof` still sees the whole array, until you pass it to a function, where only the pointer survives.

```c:run
#include <stdio.h>

void show(int *a) {                 /* a is a pointer, not an array */
    printf("inside show, sizeof a = %zu\n", sizeof a);
}

int main(void) {
    int v[5] = {10, 20, 30, 40, 50};
    printf("in main, sizeof v = %zu\n", sizeof v);
    printf("v == &v[0] ? %s\n", (v == &v[0]) ? "yes" : "no");
    printf("*(v + 2) = %d\n", *(v + 2));
    show(v);                        /* v decays to &v[0] */
    return 0;
}
```

```output
in main, sizeof v = 20
v == &v[0] ? yes
*(v + 2) = 30
inside show, sizeof a = 8
```

In `main`, `sizeof v` is `20` (five 4-byte ints) because `v` is genuinely an array there. Pass it to `show` and it has already decayed: `a` is a plain `int *`, so `sizeof a` is `8` (the size of a pointer on a 64-bit machine). The length is lost at the boundary - which is exactly why C functions that take arrays also take a separate length argument.

