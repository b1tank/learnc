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

> **Source video.** [Impariamo il C — lezione 11: chiarimenti sui puntatori](https://www.youtube.com/watch?v=msGzuneFpDU) by Salvatore Sanfilippo.

## TL;DR

Three small confusions trip everyone up the first time: (1) the **type** of a pointer decides how many bytes a dereference reads, not the underlying memory; (2) the character `'0'` is not the byte `\0` — they have values 48 and 0; (3) when you want to alternate between two buffers, swap *pointers*, don't copy data.

## Walkthrough

### Same address, two pointers, different reads `[01:27]`

If you take a `char` array and aim a `short *` at the same address (with a cast, because the compiler warns otherwise), reading through `char*` gives you one byte at a time, while reading through `short*` gives you two bytes at a time interpreted as a 16-bit integer. The memory hasn't changed — your *view* of it has. This is the whole point of pointer types: they tell the compiler the stride and the decoding rule.

### Why two bytes `{0x01, 0x01}` print as 257 `[04:42 → 10:05]`

This is just place-value arithmetic in base 256. On a little-endian machine (x86, ARM in normal mode, WebAssembly) the byte at the lower address is the least significant. So `{0x01, 0x01}` as a `short` is `1 + 1·256 = 257`; `{0x02, 0x02}` is `2 + 2·256 = 514`. Nothing C-specific is happening — it's how every base works.

### `'0'` is not `'\0'` `[11:53 → 13:36]`

A loop like `while (*p) p++;` stops when the byte equals zero. The ASCII character `'0'` has value **48**, not 0, so a string `"hello00"` does *not* stop early — those `'0'`s are perfectly ordinary non-zero bytes. To get a real terminator inside a literal you write `\0` (an escape, value 0). It looks similar on the screen; the integer values are completely different.

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

### Prefixed-length strings `[14:14 → 17:27]`

Once you accept that `\0` is just a convention, you can pick another one. Reserve the first byte of the buffer for the length, then read exactly that many bytes — no terminator needed. The cost is the obvious one: a single length byte caps you at 255 characters, two bytes at 65 535, and so on. (Pascal did this. Redis does a fancier version of it for its strings.)

### Swap pointers, don't copy buffers `[19:37 → 21:08]`

In the Game-of-Life program from the previous lesson, the "compute new state, then make it the current state" step was duplicated to avoid copying. With pointers you can collapse it: keep two pointers `old` and `new`, compute from `old` into `new`, then swap them with a temporary. The arrays never move; only the labels do. This is a tiny example of the bigger lesson — pointers let your *names* migrate over memory cheaply.

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

## Try it

1. Change `'\0'` to `'0'` in the first program — the equality flips to `yes`? No: now you compare `'0'` with itself. Predict the output before running.
2. In the swap program, increase the loop to 5 steps and predict the final values without running it.
3. Use `printf("%d ", buf[i])` in a loop to dump the raw bytes of a string literal `"a0b\0c"` and watch where the zero actually sits.

## Cross-reference to K&R

[K&R § 5.3 — Pointers and Arrays](../../kr/lessons/05-03-pointers-and-arrays.md) develops the same equivalence between array names and pointers, and is the right place to consolidate after this clarifications episode.

## Go deeper

- `man ascii` — keep this open until `'0' == 48` is muscle memory.
- *Endianness* on Wikipedia — the reason byte order matters when you reinterpret memory through a wider pointer type.
- Redis's [`sds.h`](https://github.com/antirez/sds) — a production-quality prefixed-length string library by the author of this course.
- *Two's complement* — why a `signed char` ranges `-128..127` while `unsigned char` ranges `0..255` over the same eight bits.

*Click **next →** to meet `malloc` and dynamic memory.*
