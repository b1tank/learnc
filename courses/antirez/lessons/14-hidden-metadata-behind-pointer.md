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

> **Source video.** [Let's Learn C - lesson 13](https://www.youtube.com/watch?v=9AhaOdEBmPc) by Salvatore Sanfilippo (antirez).

## TL;DR

Allocate `sizeof(header) + payload`, then hand out a pointer to the **payload** instead of to the start of the allocation. The header sits just *before* the pointer you returned; to read it, step backward. The caller sees a plain `char *` that works with every C string function, while you still get O(1) length, refcounts, or whatever else you want to stash up front.

## Why hide the header at all `[01:34 → 02:14]`

A prefixed-length string is great until you hand it to `strchr`, `printf("%s", ...)`, or any other libc function that expects a normal C string. If your "string" is really `[length][bytes...\0]` and you return a pointer to `[length]`, every libc call needs a conversion. The fix is to lie about where the string starts.

## Return the inside pointer `[04:23 → 05:27]`

After `malloc(sizeof(uint32_t) + n + 1)`, write the length into the first 4 bytes, copy the payload after it, drop a `\0` at the end - and return `base + 4`. To the caller it's an ordinary null-terminated `char *`. Trade-off: `free` must get the *original* pointer, so your `PS_free` becomes `free(s - 4)`. With `malloc`, you must `free` the exact address `malloc` returned - not some address inside the allocation. One `malloc`, one matching `free`, at the same address.

## Look backward to read the header `[05:27 → 06:38]`

Given the payload pointer `s`, the length lives at `((uint32_t *)s)[-1]`. That's the whole trick: negative indexing through a cast peeks at the bytes immediately before the pointer. `PS_len` is now O(1) - no scanning to a `\0`, unlike `strlen`, whose cost grows with the length of the string. The same slot can hold more than a length; the next lesson grows it into `[len][refcount]` and then into a real `struct`.

Here is the technique end to end. The header is one `size_t` holding the length; the payload follows, with a `\0` so libc is happy:

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

The cast `((size_t *)p)[-1]` reads the eight bytes immediately *before* `p`. Those bytes are part of the same allocation, so it's well-defined - provided you remember `buf_free` must subtract the same offset before calling `free`.

## Why bother `[09:33 → 13:43]`

Two payoffs fall out immediately. First, modern allocators can catch a double-free because they recognise the address you passed back - so a *second* `free` on the original pointer aborts loudly instead of corrupting the heap. It is not guaranteed - some allocators stay silent - so never *rely* on it. Second, once you have a hidden header you can fit more than a length into it. A second `uint32_t` becomes a reference count, and now multiple aliases can share one buffer with automatic cleanup when the last one drops. That refcount is what the next lesson builds, and it fixes the dangling-alias trap: keep a second pointer to a buffer, free through the first, and reading through the second now touches memory the allocator has already taken back - garbage, or a crash.

## The header glibc already hides for you

Your hidden length is exactly the trick the allocator itself uses. On glibc each allocation is a *chunk*, and the chunk's size is stored in the `size_t` word **right before** the pointer `malloc` hands you - the same `((size_t *)p)[-1]` slot you just used by hand. The low 3 bits of that word are status flags (the lowest, `PREV_INUSE`, is almost always set), so mask them off to read the rounded-up size:

```c:run glibc-chunk-header
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <malloc.h>

int main(void) {
    char *p = malloc(20);

    size_t word  = ((size_t *)p)[-1];   /* glibc chunk size + flag bits */
    size_t chunk = word & ~(size_t)7;   /* clear the 3 flag bits */

    printf("you asked for : %d bytes\n", 20);
    printf("size word      : %zu\n", word);
    printf("chunk size     : %zu bytes\n", chunk);
    printf("usable for you : %zu bytes\n", malloc_usable_size(p));
    printf("payload %% 16    : %lu\n", (unsigned long)((uintptr_t)p % 16));

    free(p);
    return 0;
}
```

```output
you asked for : 20 bytes
size word      : 33
chunk size     : 32 bytes
usable for you : 24 bytes
payload % 16    : 0
```

Ask for 20 bytes and glibc rounds the whole chunk up to 32: 20 bytes of payload, 8 bytes for the size word, then up to the 16-byte alignment boundary. The size word reads `33` because `32 | PREV_INUSE` is `33`. `malloc_usable_size` reports `24` - the slack between your request and the chunk boundary is yours to use, though relying on it is poor form. And the payload is 16-byte aligned (`payload % 16 == 0`), which is why a 4- or 8-byte header in front of `char` data is always safe: `malloc` already returns memory aligned for every standard type. If you ever invert the layout - a small header in front of a wider payload - pad the header up to the payload's alignment (`_Alignof`) or reads through the payload pointer become undefined behaviour. This is the same bookkeeping K&R's allocator keeps explicitly, and the same reason `free` needs the exact original pointer: it steps back to this header to find the chunk's size.
