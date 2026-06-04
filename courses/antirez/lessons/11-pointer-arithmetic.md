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

> **Source video.** [Corso di programmazione in C — lezione 10: aritmetica dei puntatori](https://www.youtube.com/watch?v=lc7hL9Wt-ho) by Salvatore Sanfilippo.

## TL;DR

Pointers are integers, but `p + 1` does **not** add one byte — it adds `sizeof *p`, so it lands on the *next element* of whatever type `p` points to. Array names decay to a pointer to their first element, and `a[i]` is literally defined as `*(a + i)` — which is why `2[a]` even compiles.

## Walkthrough

### Arrays decay to pointers `[09:14 → 11:35]`

The name of an array is, in almost every expression, the address of its first element. You don't write `&myStr` — you just use `myStr`:

```c
char myStr[] = "Hello";
char *p = myStr;        // legal; same as &myStr[0]
```

`printf("%p", myStr)` and `printf("%p", p)` print the same address. `%s` then walks forward until it hits the `\0` terminator.

### `p + 1` adds `sizeof *p`, not 1 `[18:01 → 19:33]`

This is the rule that makes pointer arithmetic useful. If `p` is `short *` and `short` is 2 bytes, `p + 1` advances the address by 2 bytes; `p += 4` advances it by 8. The compiler scales the integer offset by the size of the pointed-to type so that "+1" always means "next element of this type", regardless of how wide that element is.

The same rule explains the `char *` → `short *` cast demo in the video: reinterpreting a byte array as 16-bit shorts, then doing `p++`, jumps two bytes forward — not one.

### `a[i]` is exactly `*(a + i)` `[13:11 → 14:50]`

Indexing is not a language primitive in C; it is sugar over pointer arithmetic. `a[i]`, `*(a + i)`, `p[i]`, `*(p + i)` are all the same expression after the compiler is done with them. (And because addition commutes, `i[a]` is legal C. Don't write it.)

### Walking a buffer with `p++` `[21:20 → 23:30]`

Once you have a pointer into an array, incrementing it is how you traverse:

```c
while (*p) putchar(*p++);
```

The pointer is consumed as you go: after the loop it points to the terminating zero, not back to the start. Save the start address if you still need it.

### Functions take a pointer; the caller can offset it `[27:31 → 28:17]`

If `print_string(char *s)` walks a string, `print_string(s + 3)` skips the first three characters — same function, the caller just hands it an address three bytes further in. This is why C "passes arrays by reference" without any special syntax: only the pointer is copied, and any arithmetic on it stays local to the callee.

### Walk an `int[]` with a pointer `[13:52 → 14:50]`

The pointer-arithmetic rule means the *same* `p++` idiom works for an array of any element type, with no changes to the loop body:

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

`a + n` is one past the last element — the standard sentinel for "stop here". Building it doesn't dereference anything, so it is legal; *dereferencing* `a + n` would not be.

### `a[i]` and `*(a + i)` really are the same `[13:11 → 13:52]`

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

## Under the hood (asm)

Why `p[i]` is "free" — x86 has an indexed addressing mode that does the multiply *inside* the load:

```asm
idx:                           ; int idx(int *p, int i) { return p[i]; }
        endbr64
        movsx   rsi, esi              ; widen i from 32 → 64 bits
        mov     eax, DWORD PTR [rdi+rsi*4]  ; *(p + i) in ONE instruction
        ret
```

The `[rdi+rsi*4]` is the full "base + index × scale" addressing mode. The `*4` is the `sizeof(int)` your C code never wrote — the compiler bakes it in. `p[i]` and `*(p + i)` produce **byte-identical** asm; they're the same operation spelled two ways.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for register/calling-convention details.

## Try it

1. Change `int a[]` to `short a[]` in the first runnable (and `int *p` to `short *p`); the output is identical because the loop is written in terms of *elements*, not bytes.
2. Print `(void*)(a + 1) - (void*)a` — you get `sizeof(int)` (usually `4`), not `1`.
3. Replace the loop body with `printf("%d ", p[0]);` — same output, because `p[0]` is `*(p + 0)`.

## Cross-reference to K&R

[K&R § 5.4 — Address Arithmetic](../../kr/lessons/05-04-address-arithmetic.md) is the canonical treatment: the scaling rule, the legality of one-past-the-end, and the equivalence of `a[i]` and `*(a+i)`. K&R is terser but covers the same ground in the same order.

## Go deeper

- `man 3 memcpy`, `man 3 memmove` — standard-library primitives whose signatures are pure pointer arithmetic over byte buffers.
- [cppreference: pointer arithmetic](https://en.cppreference.com/w/c/language/operator_arithmetic#Pointer_arithmetic) — the exact rules, including when "one past the end" is and is not legal.
- *The C Programming Language*, 2nd ed., §5.3–5.5 — Kernighan & Ritchie on pointers, arrays, and address arithmetic together.
- Try `cc -fsanitize=address,undefined` on a loop with `a[n]` (one too many): the sanitiser flags exactly the kind of off-by-one Salvatore warns about.
