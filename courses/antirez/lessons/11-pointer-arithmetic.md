---
id: 11-pointer-arithmetic
chapter: 5
label: "5.2"
title: Pointer arithmetic
prev: 10-pointers-intro
next: 12-pointers-clarifications
status: draft
source:
  videoId: lc7hL9Wt-ho
  url: https://www.youtube.com/watch?v=lc7hL9Wt-ho
---

> **Source video.** [Let's Learn C - lesson 10](https://www.youtube.com/watch?v=lc7hL9Wt-ho) by Salvatore Sanfilippo (antirez).

## TL;DR

Pointers are integers, but `p + 1` does **not** add one byte - it adds `sizeof *p`, so it lands on the *next element* of whatever type `p` points to. Array names decay to a pointer to their first element, and `a[i]` is literally defined as `*(a + i)` - which is why `2[a]` even compiles.

## Arrays decay to pointers `[09:14 → 11:35]`

The name of an array is, in almost every expression, the address of its first element. You don't write `&myStr` - you just use `myStr`:

```c
char myStr[] = "Hello";
char *p = myStr;        // legal; same as &myStr[0]
```

`printf("%p", myStr)` and `printf("%p", p)` print the same address. `%s` then walks forward until it hits the `\0` terminator.

## `a[i]` is exactly `*(a + i)` `[13:11 → 14:50]`

Indexing is not a language primitive in C; it is sugar over pointer arithmetic. `a[i]`, `*(a + i)`, `p[i]`, `*(p + i)` are all the same expression after the compiler is done with them. (And because addition commutes, `i[a]` is legal C. Don't write it.) You can watch the two spellings agree element by element:

```c:run index-vs-deref.c
#include <stdio.h>

int main(void) {
    int a[] = {10, 20, 30, 40, 50};
    for (int i = 0; i < 5; i++) {
        printf("a[%d]=%d  *(a+%d)=%d\n", i, a[i], i, *(a + i));
    }
    return 0;
}
```

```output
a[0]=10  *(a+0)=10
a[1]=20  *(a+1)=20
a[2]=30  *(a+2)=30
a[3]=40  *(a+3)=40
a[4]=50  *(a+4)=50
```

## `p + 1` adds `sizeof *p`, not 1 `[18:01 → 19:33]`

This is the rule that makes pointer arithmetic useful. If `p` is `short *` and `short` is 2 bytes, `p + 1` advances the address by 2 bytes; `p += 4` advances it by 8. The compiler scales the integer offset by the size of the pointed-to type so that "+1" always means "next element of this type", regardless of how wide that element is.

## Reinterpreting bytes through a `short *` `[14:50 → 19:33]`

Point a `short *` at a `char` array (the cast silences the type warning) and each read now grabs *two* bytes, combined little-endian: byte 0 plus byte 1 × 256. Crucially, `p++` then advances **two** bytes, landing on the next pair - not the next byte:

```c:run short-cast.c
#include <stdio.h>

int main(void) {
    char myStr[] = {'A','B','C','D','E','F','\0'};
    short *p = (short *)myStr;   /* reinterpret the bytes as 16-bit shorts */
    printf("%d\n", *p);          /* 'A' + 'B'*256 */
    p++;                         /* +1 here means +2 bytes */
    printf("%d\n", *p);          /* 'C' + 'D'*256 */
    return 0;
}
```

```output
16961
17475
```

`'A'` is 65 and `'B'` is 66, so the first short is `65 + 66*256 = 16961`; after `p++` the pointer skips past `'A','B'` to `'C','D'` → `67 + 68*256 = 17475`. Salvatore double-checks the arithmetic in a Python REPL:

```
python3 -c "print(65 + 66*256, 67 + 68*256)"
```

```output
16961 17475
```

## Walking an array with `p++` `[21:20 → 23:30]`

Once you have a pointer into an array, incrementing it is how you traverse. The classic string idiom is `while (*p) putchar(*p++);` - the pointer is consumed as you go, so after the loop it points at the terminating zero, not back at the start. Because the scaling rule is per-element, the *same* `p++` idiom walks an array of any type with no change to the loop body:

```c:run walk-int-array.c
#include <stdio.h>

int main(void) {
    int a[] = {10, 20, 30, 40, 50};
    int n = sizeof a / sizeof a[0];
    for (int *p = a; p < a + n; p++) {
        printf("%d ", *p);
    }
    printf("\n");
    return 0;
}
```

```output
10 20 30 40 50 
```

`a + n` is one past the last element - the standard sentinel for "stop here". Building it doesn't dereference anything, so it is legal; *dereferencing* `a + n` would not be.

## Functions take a pointer; the caller can offset it `[27:31 → 28:17]`

If `print_string(char *s)` walks a string, `print_string(s + 3)` skips the first three characters - same function, the caller just hands it an address three bytes further in. This is why C "passes arrays by reference" without any special syntax: only the pointer is copied, and any arithmetic on it stays local to the callee.

## How far does `p + 1` actually move?

The scaling rule is easy to assert directly: subtract two consecutive element addresses, cast both to `char *` so the difference comes out in *bytes*, and you get exactly `sizeof *p`. The raw addresses vary every run, but their difference is fixed by the element type:

```c:run step.c
#include <stdio.h>

int main(void) {
    int   ai[3];
    char  ac[3];
    int  *pi = ai;
    char *pc = ac;
    /* difference in BYTES between consecutive elements -- this is sizeof *p */
    printf("int*  step = %ld bytes\n", (char *)(pi + 1) - (char *)pi);
    printf("char* step = %ld bytes\n", (char *)(pc + 1) - (char *)pc);
    return 0;
}
```

```output
int*  step = 4 bytes
char* step = 1 bytes
```

`pi + 1` jumps 4 bytes because `sizeof(int)` is 4; `pc + 1` jumps 1 because `sizeof(char)` is 1. The `+ 1` you wrote never appears in bytes - the compiler multiplies it by the element size for you.

## What `a[i]` compiles to

That multiply is `i * sizeof *p`, and on x86 it costs nothing: the CPU has an addressing mode that does the scale *inside* the load. Compile `p[i]` for an `int *` and a `char *` with `gcc -O2 -masm=intel`:

```asm
idx:                           ; int idx(int *p, int i)   { return p[i]; }
        endbr64
        movsx   rsi, esi                   ; widen i from 32 -> 64 bits
        mov     eax, DWORD PTR [rdi+rsi*4]  ; base + i*4  in ONE instruction
        ret
idx_c:                         ; int idx_c(char *p, int i){ return p[i]; }
        endbr64
        movsx   rsi, esi
        movsx   eax, BYTE PTR [rdi+rsi]     ; base + i*1  (scale of 1, omitted)
        ret
```

`[rdi+rsi*4]` is the full "base + index × scale" addressing mode, and the `*4` is the `sizeof(int)` your C never wrote. Switch the element type to `char` and the scale drops to 1 (`[rdi+rsi]`), matching the byte step measured above. `p[i]` and `*(p + i)` produce **byte-identical** asm: they are the same operation spelled two ways.
