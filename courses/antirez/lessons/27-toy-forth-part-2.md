---
id: 27-toy-forth-part-2
chapter: 9
label: "9.3"
title: Toy Forth interpreter (part 2)
prev: 26-toy-forth-part-1
next: 28-toy-forth-part-3
status: draft
source:
  videoId: -QxrmHo-V7Y
  url: https://www.youtube.com/watch?v=-QxrmHo-V7Y
---

> **Source video.** [Let's Learn C - lesson 24](https://www.youtube.com/watch?v=-QxrmHo-V7Y) by Salvatore Sanfilippo (antirez).

## TL;DR

Part 2 turns the bare object/parser scaffolding from part 1 into something that actually reads a program off disk and produces an in-memory list of objects. The work is small but every piece is canonical C: portable file-size with `fseek`/`ftell`, an amortized-O(1) growable array via `realloc`, and a hand-written tokeniser that advances a `char *` cursor through the source.

## Slurping the file portably `[10:10 → 16:28]`

`fopen` it, then the classic three-step: `fseek(fp, 0, SEEK_END)`, `ftell(fp)` for the size, `fseek(fp, 0, SEEK_SET)` to rewind, then `fread` into an `xmalloc(size + 1)` buffer and write a `'\0'` at `buf[size]`. The extra byte is non-negotiable: the parser will treat the text as a C string and walk it with `p[0] == 0` as the stop condition. Forgetting the rewind means `fread` returns zero bytes from the now-positioned-at-EOF handle - a fun bug to discover the first time.

## Confirming the size: 14 bytes `[12:03 → 12:33]`

A quick sanity check before parsing anything - print the size `ftell` reported. The sample program is `5 dup * print` plus a trailing newline:

```
cat program.toy
```

```output
5 dup * print
```

```
./a.out program.toy
```

```output
source file size 14
```

Thirteen visible characters plus the newline - exactly the 14 bytes `fseek`/`ftell` measured.

## Amortised growth with `realloc` `[05:14 → 09:02]`

`realloc(NULL, n)` is just `malloc(n)`, so `listPush` doesn't need a special "first allocation" branch. The toy reallocates on every push for simplicity, but Salvatore is careful to explain the real fix: track `alloc_len` separately and double it (`4 → 8 → 16 → …`) so the amortised cost per push stays O(1) while you keep the headline win of an array - O(1) random access. A linked list gives you O(1) push but `arr[i]` becomes O(n), and a `for` over every element silently turns quadratic. That trade-off is why Python's `list`, Go's slice, and C++'s `vector` are all geometrically-grown arrays under the hood.

## Refcount ownership: caller's problem `[35:31 → 37:41]`

`createIntObject` hands you an object with refcount 1. `listPush` *adds* a reference by storing the pointer. Whose job is the bookkeeping? Salvatore picks "the caller's" and writes it into the function's docstring. The alternative (push bumps the refcount internally) means every caller that just created a fresh object has to immediately `dec_ref` to balance - uglier in the common case. Either rule works; the bug is having no rule.

## The parse loop `[25:54 → 32:35]`

The top level is just `while (p[0]) { parseSpaces(p); if (p[0] == 0) break; … dispatch on p[0] … }`. Dispatch is `if (isdigit(p[0]) || p[0] == '-') o = parseNumber(p); else o = NULL;` - a single arm so far, with `NULL` standing in for "unknown token, will be a syntax error". Capture `token_start = p` *before* the parse so error messages point at the start of the bad token, not wherever the parser gave up.

## `parseNumber` without `strtol` `[40:17 → 46:12]`

Save `start = p`, optionally consume a leading `'-'`, then `while (isdigit(p[0])) p++;`. The length is `end - start` (pointer subtraction inside the same allocation is well-defined). Reject anything over `MAX_NUM_LEN`, `memcpy` into a stack buffer, null-terminate, hand to `atoi`, wrap in `createIntObject`. `atoi` is famously lousy at error reporting - `strtol` with an `endptr` is the production answer - but for a toy that's already validated the characters, it's fine.

## Watching the list take shape `[50:08 → 54:07]`

With a throwaway `exec` that just walks the list and prints each element (`[`, then every number, then `]`), the whole pipeline - file → string → token list - becomes visible. Feed it `5 10 20`:

```
./a.out program.tf
```

```output
[
5 10 20 ]
```

The first attempt printed garbage because the loop dereferenced the wrong pointer; once it reads `o->i` for the current element, the three integers come back out in order - proof that the source text is now a real `tfobj` list in memory.

## A one-pass whitespace tokeniser

The parse loop above, distilled to its essence: advance past spaces, mark the start, advance to the next space, emit the slice. This is the shape of every hand-written tokeniser you'll ever read.

```c:run
#include <stdio.h>
#include <ctype.h>

int main(void) {
    const char *p = "  5   dup *  print  ";
    while (*p) {
        while (isspace((unsigned char)*p)) p++;
        if (*p == '\0') break;
        const char *start = p;
        while (*p && !isspace((unsigned char)*p)) p++;
        int len = (int)(p - start);
        printf("token: %.*s\n", len, start);
    }
    return 0;
}
```

```output
token: 5
token: dup
token: *
token: print
```

Three details to notice. The cast to `unsigned char` before `isspace` avoids undefined behaviour on systems where `char` is signed and the source contains bytes ≥ 0x80. The `%.*s` conversion prints exactly `len` bytes starting at `start` - no temporary buffer, no `memcpy`, no null terminator needed. And the outer `while (*p)` plus inner skip means an all-whitespace tail produces zero tokens, which is what you want.
