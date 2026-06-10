---
id: 21-opaque-types-and-files
chapter: 8
label: "8.2"
title: Opaque types, typedef, and stdio files
prev: 19-algorithm-archaeology
next: 22-system-calls
status: draft
source:
  videoId: 3w73xjUSUEU
  url: https://www.youtube.com/watch?v=3w73xjUSUEU
---

> **Source video.** [Let's Learn C - lesson 18](https://www.youtube.com/watch?v=3w73xjUSUEU) by Salvatore Sanfilippo (antirez).

## TL;DR

`FILE *` is the canonical *opaque type* in C: the standard library hands you a pointer and reserves the right to lay out the struct however it likes. The tool that builds this pattern is `typedef` - forward-declare a `struct`, expose only the typedef'd pointer, and the caller can pass it around without ever seeing the fields.

## `typedef` is a type alias, not a new type `[01:11 → 04:15]`

Syntactically, `typedef` looks like a variable declaration with `typedef` glued to the front: `typedef int error_code;` reads as "what *would* be a variable named `error_code` of type `int` is instead a *name* for the type `int`." From then on `error_code` and `int` are interchangeable. For plain integers Salvatore prefers the explicit `int` (an `enum` documents intent better), but for structs `typedef` earns its keep.

## `typedef struct` is the idiomatic struct shorthand `[04:15 → 07:43]`

```c
typedef struct { int n; int d; } fract;
typedef fract *fractptr;
```

Two payoffs: you write `fract f;` instead of `struct fract f;`, and the pointer-typedef bakes the `*` into the name so `fractptr fp = &f;` already *is* a pointer - no asterisk at the use site.

## Opaque types: hide the struct, expose the pointer `[08:16 → 09:48]`

That same trick is how the standard library hides `FILE`. The header gives you something like `typedef struct _IO_FILE FILE;` (the actual struct stays private to libc). You only ever hold a `FILE *`. You can't read its fields, can't `sizeof` it, can't allocate one on the stack - you must go through library calls. That's the contract.

## `fopen` / `fclose` / `fread` `[09:48 → 12:35]`

`fopen(path, mode)` allocates the hidden struct and opens the underlying OS file descriptor; it returns `NULL` on failure (always check). `fclose(fp)` releases both - skip it and you leak memory *and* a kernel handle. `fread(buf, size, count, fp)` reads `size * count` bytes; the two-argument split is a 1970s wart worth knowing about but not loving.

## Dumping a file's bytes with `fread` `[15:14 → 19:27]`

`fread(buf, 1, sizeof buf, fp)` reads up to 32 bytes and returns how many it actually got - a `size_t`, printed with `%zd`:

```c
char buf[32];
size_t nread = fread(buf, 1, sizeof buf, fp);
printf("%zd\n", nread);   /* -> 32 */
```

Loop until `fread` returns 0 and hand each chunk to the `hexdump()` helper from the earlier lessons, and the program dumps its own source file:

```c
char buf[32];
size_t nread;
while ((nread = fread(buf, 1, sizeof buf, fp)) != 0)
    hexdump(buf, nread);
```

That is essentially what the system `hexdump -C` prints over the same bytes - same hex columns, same printable-ASCII gutter.

## Why the library exists at all `[20:07 → 21:58]`

`man 3 fopen` - section 3 means *C library*, not *system call*. Underneath, libc calls POSIX `open`/`read`/`close` (section 2). The opaque `FILE *` is what lets libc add buffering, error flags, and position tracking on top of a raw integer file descriptor without your code knowing or caring.

## Building an opaque type yourself

The pattern Salvatore describes is something you can build directly. Split it in two halves: a *public* face (a `typedef` to an incomplete `struct` plus function prototypes) that callers see, and a *private* implementation (the `struct` definition plus the function bodies) that they don't. In real projects the public half lives in a `.h` and the private half in a `.c`. Here both halves sit in one file, but `main` is written above the struct definition - so it provably cannot touch a field even if it wanted to:

```c:run An opaque Counter type
#include <stdio.h>
#include <stdlib.h>

/* Public part: callers see only the typedef'd pointer and the functions. */
typedef struct Counter Counter;
Counter *counter_new(void);
void counter_inc(Counter *c);
int counter_get(Counter *c);
void counter_free(Counter *c);

int main(void) {
    Counter *c = counter_new();
    counter_inc(c);
    counter_inc(c);
    counter_inc(c);
    printf("count = %d\n", counter_get(c));
    counter_free(c);
    return 0;
}

/* Private part: the struct layout lives here, out of the caller's reach. */
struct Counter { int n; };
Counter *counter_new(void) { Counter *c = malloc(sizeof *c); c->n = 0; return c; }
void counter_inc(Counter *c) { c->n++; }
int counter_get(Counter *c) { return c->n; }
void counter_free(Counter *c) { free(c); }
```

```output
count = 3
```

`typedef struct Counter Counter;` names a type whose layout is *incomplete* until the `struct Counter { ... }` below. Anywhere the layout is unknown - all of `main` - you can hold a `Counter *` and pass it around, but `c->n` would not compile. That is exactly the wall libc puts between your code and the innards of `FILE`.

## A real `fopen` / `fwrite` / `fread` / `fclose` round-trip

`FILE *` is that same opaque handle, and the four calls above are the only door through it. This writes three `int`s to a temp file as raw bytes, then reads them straight back - the program never inspects a field of `FILE`, only passes the pointer along:

```c:run Round-trip three ints through a file
#include <stdio.h>

int main(void) {
    const char *path = "/tmp/learnc_21_roundtrip.bin";

    int out[3] = {10, 20, 30};
    FILE *w = fopen(path, "wb");
    if (w == NULL) { perror("fopen"); return 1; }
    size_t nw = fwrite(out, sizeof(int), 3, w);
    fclose(w);

    int in[3] = {0, 0, 0};
    FILE *r = fopen(path, "rb");
    if (r == NULL) { perror("fopen"); return 1; }
    size_t nr = fread(in, sizeof(int), 3, r);
    fclose(r);

    printf("wrote %zu ints, read %zu ints: %d %d %d\n", nw, nr, in[0], in[1], in[2]);
    return 0;
}
```

```output
wrote 3 ints, read 3 ints: 10 20 30
```

`fopen` allocates the hidden struct and returns the pointer; `fwrite`/`fread` move `sizeof(int) * 3` bytes through it and report how many *objects* they handled; `fclose` releases the struct and the kernel file descriptor together. The bytes survive on disk because everything went through the handle - which is the whole reason `FILE *` is opaque: libc is free to buffer, track position, and flag errors behind that pointer without your code ever depending on the layout. (Swap the path for `tmpfile()` and you get an anonymous file the OS deletes for you - handy when you only need the round-trip, not the bytes afterwards.)
