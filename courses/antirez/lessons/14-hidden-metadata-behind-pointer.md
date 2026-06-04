---
id: 14-hidden-metadata-behind-pointer
chapter: 6
label: "6.2"
title: The hidden-metadata-behind-the-pointer trick
prev: 13-malloc-first-encounter
next: 15-structs-of-c
status: draft
source:
  videoId: 9AhaOdEBmPc
  url: https://www.youtube.com/watch?v=9AhaOdEBmPc
---

> **Source video.** [Let's Learn C — lesson 13](https://www.youtube.com/watch?v=9AhaOdEBmPc) (originally *Corso di programmazione in C — lezione 13: il trucco dei metadati nascosti dietro al puntatore*) by Salvatore Sanfilippo.

## TL;DR

Allocate `sizeof(header) + payload`, then hand out a pointer to the **payload** instead of to the start of the allocation. The header sits just *before* the pointer you returned; to read it, step backward. The caller sees a plain `char *` that works with every C string function, while you still get O(1) length, refcounts, or whatever else you want to stash up front.

## Walkthrough

### Why hide the header at all `[01:34 → 02:14]`

A prefixed-length string is great until you hand it to `strchr`, `printf("%s", ...)`, or any other libc function that expects a normal C string. If your "string" is really `[length][bytes...\0]` and you return a pointer to `[length]`, every libc call needs a conversion. The fix is to lie about where the string starts.

### Return the inside pointer `[04:23 → 05:27]`

After `malloc(sizeof(uint32_t) + n + 1)`, write the length into the first 4 bytes, copy the payload after it, drop a `\0` at the end — and return `base + 4`. To the caller it's an ordinary null-terminated `char *`. Trade-off: `free` must get the *original* pointer, so your `PS_free` becomes `free(s - 4)`. One `malloc`, one matching `free`, at the exact address `malloc` returned.

### Look backward to read the header `[05:27 → 06:38]`

Given the payload pointer `s`, the length lives at `((uint32_t *)s)[-1]`. That's the whole trick: negative indexing through a cast peeks at the bytes immediately before the pointer. `PS_len` is now O(1) — no scanning to a `\0`, unlike `strlen`. The same slot can hold more than a length; the next lesson grows it into `[len][refcount]` and then into a real `struct`.

### Alignment caveat

`malloc` returns memory aligned for every standard type, so a 4- or 8-byte header in front of `char` bytes is fine. If you ever invert the layout (small header in front of a wider type), make sure the header size is a multiple of the payload's alignment — otherwise reads through the payload pointer are undefined behaviour. `_Alignof` and padding the header up to `alignof(max_align_t)` is the safe move.

### Why bother

Two payoffs fall out immediately. (1) Modern allocators can catch a double-free because they recognise the address you passed back — so a *second* `PS_free(s)` aborts loudly instead of corrupting the heap `[09:33 → 10:24]`. (2) Once you have a hidden header, you can fit more than length into it. A second `uint32_t` becomes a reference count, and now multiple aliases can share one buffer with automatic cleanup when the last one drops `[12:00 → 13:43]`. That's the next lesson.

## A buffer with a hidden length

```c:run hidden-length
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define len_of(p) (((size_t *)(p))[-1])

static char *buf_new(const char *src) {
    size_t n = strlen(src);
    void *base = malloc(sizeof(size_t) + n + 1);
    *(size_t *)base = n;
    char *payload = (char *)base + sizeof(size_t);
    memcpy(payload, src, n);
    payload[n] = '\0';
    return payload;
}

static void buf_free(char *p) {
    free((char *)p - sizeof(size_t));
}

int main(void) {
    char *s = buf_new("hidden metadata");
    printf("payload : %s\n", s);          /* works with libc */
    printf("length  : %zu\n", len_of(s)); /* O(1), no scan */
    buf_free(s);
    return 0;
}
```

```output
payload : hidden metadata
length  : 15
```

The cast `((size_t *)p)[-1]` reads the four-or-eight bytes immediately *before* `p`. Those bytes are part of the same allocation, so it's well-defined — provided you remember `buf_free` must subtract the same offset before calling `free`.

## Try it

1. Replace `size_t` with `uint32_t` (from `<stdint.h>`) and update `len_of` accordingly. The header shrinks from 8 bytes to 4 on a 64-bit system — at the cost of capping strings at 4 GB.
2. Add `len_of(s) -= 1; s[len_of(s)] = '\0';` to "pop" the last character. Print `s` and the new length.
3. Call `buf_free(s)` twice. On a modern libc, what happens the second time? (Don't rely on it — just observe.)

## Cross-reference to K&R

[K&R § 8.7 — Example: A Storage Allocator](../../kr/lessons/08-07-example-a-storage-allocator.md) builds the same idea from the other side: their allocator keeps a per-block header that holds the block's size, and the user pointer points to the byte *after* that header. K&R's allocator is itself an instance of this trick.

## Go deeper

- antirez's [`sds.h`](https://github.com/antirez/sds) — the production version of exactly this technique, with multiple header sizes chosen by string length.
- Lua's `TString` and Tcl's reference-counted objects — different shapes, same idea: a fat header sits before the bytes the rest of the code sees.
- Jemalloc / tcmalloc internals — modern allocators keep their own per-allocation metadata in the same spirit, which is why they can detect some double-frees.
- `man 3 malloc_usable_size` — peek at how much the allocator actually gave you; the answer often exceeds what you asked for, and it lives in a hidden header just like ours.

*Click **next →** to meet `struct`, which makes this layout something the compiler manages for you.*
