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

> **Source video.** [Let's Learn C — lesson 18](https://www.youtube.com/watch?v=3w73xjUSUEU) by Salvatore Sanfilippo (antirez).

## TL;DR

`FILE *` is the canonical *opaque type* in C: the standard library hands you a pointer and reserves the right to lay out the struct however it likes. The tool that builds this pattern is `typedef` — forward-declare a `struct`, expose only the typedef'd pointer, and the caller can pass it around without ever seeing the fields.

## Walkthrough

### `typedef` is a type alias, not a new type `[01:11 → 04:15]`

Syntactically, `typedef` looks like a variable declaration with `typedef` glued to the front: `typedef int error_code;` reads as "what *would* be a variable named `error_code` of type `int` is instead a *name* for the type `int`." From then on `error_code` and `int` are interchangeable. For plain integers Salvatore prefers the explicit `int` (an `enum` documents intent better), but for structs `typedef` earns its keep.

### `typedef struct` is the idiomatic struct shorthand `[04:15 → 07:43]`

```c
typedef struct { int n; int d; } fract;
typedef fract *fractptr;
```

Two payoffs: you write `fract f;` instead of `struct fract f;`, and the pointer-typedef bakes the `*` into the name so `fractptr fp = &f;` already *is* a pointer — no asterisk at the use site.

### Opaque types: hide the struct, expose the pointer `[08:16 → 09:48]`

That same trick is how the standard library hides `FILE`. The header gives you something like `typedef struct _IO_FILE FILE;` (the actual struct stays private to libc). You only ever hold a `FILE *`. You can't read its fields, can't `sizeof` it, can't allocate one on the stack — you must go through library calls. That's the contract.

### `fopen` / `fclose` / `fread` `[09:48 → 12:35]`

`fopen(path, mode)` allocates the hidden struct and opens the underlying OS file descriptor; it returns `NULL` on failure (always check). `fclose(fp)` releases both — skip it and you leak memory *and* a kernel handle. `fread(buf, size, count, fp)` reads `size * count` bytes; the two-argument split is a 1970s wart worth knowing about but not loving.

### Dumping a file's bytes with `fread` `[15:14 → 19:27]`

`fread(buf, 1, sizeof buf, fp)` reads up to 32 bytes and returns how many it actually got — a `size_t`, printed with `%zd`:

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

That is essentially what the system `hexdump -C` prints:

```
hexdump -C stdio1.c | head
```

```output
00000000  23 69 6e 63 6c 75 64 65  20 3c 73 74 64 69 6f 2e  |#include <stdio.|
00000010  68 3e 0a 0a 69 6e 74 20  6d 61 69 6e 28 76 6f 69  |h>..int main(voi|
...
```

### Why the library exists at all `[20:07 → 21:58]`

`man 3 fopen` — section 3 means *C library*, not *system call*. Underneath, libc calls POSIX `open`/`read`/`close` (section 2). The opaque `FILE *` is what lets libc add buffering, error flags, and position tracking on top of a raw integer file descriptor without your code knowing or caring.

### A small program

`tmpfile()` returns a `FILE *` to an anonymous file the OS deletes for you — perfect for a self-contained example. Write three lines, rewind, read them back.

```c:run Round-trip through a temp file
#include <stdio.h>

int main(void) {
    FILE *fp = tmpfile();
    if (fp == NULL) { perror("tmpfile"); return 1; }

    fprintf(fp, "alpha\n");
    fprintf(fp, "beta %d\n", 42);
    fprintf(fp, "gamma\n");

    rewind(fp);

    char line[64];
    while (fgets(line, sizeof line, fp) != NULL) {
        fputs(line, stdout);
    }
    fclose(fp);
    return 0;
}
```

```output
alpha
beta 42
gamma
```

You never touched a field of `FILE` — and you couldn't have. Everything went through the four library calls, exactly as the opaque-type contract intends.

## Try it

1. Drop the `rewind(fp)` and re-run. `fgets` reads from the *current* position — without rewinding, there's nothing left to read.
2. Replace `tmpfile()` with `fopen("/tmp/learnc_demo.txt", "w+")` and then `cat` the file from a terminal. Same program, but now the bytes outlive the process.
3. Forget the `fclose`. The program still prints — but on a long-running process you'd be leaking a struct and a kernel file descriptor each call.

## Cross-reference to K&R

[K&R § 7.5 — File Access](../../kr/lessons/07-05-file-access.md) introduces `FILE *`, `fopen`, `fclose`, `getc`/`putc` from the language designers themselves. K&R names the opaque-type idea in passing; Salvatore makes the `typedef` mechanism that enables it the centrepiece.

## Go deeper

- `man 3 fopen`, `man 3 fread`, `man 3 tmpfile` — the canonical reference, one terminal away.
- cppreference: <https://en.cppreference.com/w/c/io/FILE> — what the standard does and does not promise about the `FILE` type.
- `fopencookie(3)` on glibc and `funopen(3)` on BSD/macOS let you supply your own read/write/seek callbacks and get back a real `FILE *` — opaque types as an extension point, not just a hiding mechanism.
- John R. Levine, *Linkers and Loaders* — for what actually happens when libc gets linked into your `a.out`.

*Click **next →** to drop below libc and call the kernel directly with POSIX system calls.*
