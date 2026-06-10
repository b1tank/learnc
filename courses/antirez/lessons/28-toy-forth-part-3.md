---
id: 28-toy-forth-part-3
chapter: 9
label: "9.4"
title: Toy Forth interpreter (part 3)
prev: 27-toy-forth-part-2
next: 29-toy-forth-exec-internals
status: draft
source:
  videoId: -1ZhCgaIPOk
  url: https://www.youtube.com/watch?v=-1ZhCgaIPOk
---

> **Source video.** [Let's Learn C - lesson 25](https://www.youtube.com/watch?v=-1ZhCgaIPOk) by Salvatore Sanfilippo (antirez).

## TL;DR

Part 3 finishes the front end: a recursive `print_object` that walks nested lists, and a lexer that now recognises **symbols** like `plus` or `+` alongside numbers and strings. The interesting idea is the predicate - `isalpha(c) || strchr(allowed, c)` - using `strchr` as a one-line set-membership test on a tiny allowed-character string. With immediate values and symbols both parseable, the next step is `exec`.

## `print_object` becomes recursive `[00:59 → 04:03]`

The old `exec` was just a switch that printed integers. Rename it `print_object`, add a case for `TF_OBJECT_LIST`, and instead of duplicating the per-type formatting inside that case, **call `print_object` again** on each element. A nested list prints itself the same way the outer one does - that's all you need for arbitrarily deep nesting. Salvatore drops the trailing newline inside the list branch so a list-of-lists comes out on one line.

## The missing newline and zsh's `%` `[04:29 → 05:03]`

Recompiling after the rename prints the list exactly as before. But because the function emits no trailing newline, `zsh` flags it: it shows a reverse-video `%` at the end of the line to mark output that didn't end in `\n`.

```
./a.out program.tf
```

```output
[5 10 20 ]%
```

The fix is to print a single `\n` at the top-level call site - dropping the newline *inside* the list branch (for nesting) but adding it back once around the whole object.

## Recursion isn't an academic toy `[19:36 → 20:06]`

The aside is worth quoting: in C, recursion is often the *simplest* implementation, not the clever one. A tagged-union tree (integers, symbols, lists of either) wants a recursive printer; trying to do it iteratively means hand-rolling a stack.

## Symbols enter the parser `[05:47 → 07:46]`

Until now the parser handled numbers and strings. After the integer/string branches, add an `else if` for symbols: any token that *starts* with an allowed symbol character. A number begins with a digit (or `-` followed by a digit); a string begins with `"`; everything else that looks like a name is a symbol. Words like `plus`, `print`, `+`, `*` all land here.

## `isalpha || strchr` as a set test `[10:51 → 12:28]`

The allowed extras are kept in a tiny string: `static const char *sym_chars = "+-*/%";`. To ask "is `c` allowed inside a symbol?" Salvatore writes `isalpha(c) || strchr(sym_chars, c) != NULL`. `strchr` returns a pointer to the first match or `NULL`, so it doubles as a contains-check on a small character set. He calls this the way an *expert* would write it - no extra `if` ladder, no second loop. The `!= NULL` is optional but kept for readability.

## Centralise the allocation `[14:48 → 16:19]`

`create_string_object(s, len)` used to assume the caller had already `xmalloc`'d the buffer. The cleanup moves the `xmalloc(len + 1)`, the `memcpy(p, s, len)`, and the trailing `p[len] = 0` *inside* the constructor. Now the lexer just hands over the source pointer plus the length it measured with `p - start` (pointer math again), and the constructor owns the copy. One fewer concern at every call site.

## Symbols print with a leading quote `[18:53 → 19:36]`

To confirm that words like `plus` and `print` really parse as symbols (not strings), Salvatore temporarily prefixes a `'` when printing a symbol. A program that mixes numbers and bare words now shows which is which:

```
./a.out program.tf
```

```output
[5 5 'plus 'print ]
```

The leading `'` marks each token as `TFOBJ_TYPE_SYMBOL`; a string literal would have printed inside double quotes instead. The prefix is just a debugging aid and gets removed afterward - but it proves the recursive `print_object` is generic over every object type.

## A tiny tokeniser using the same trick

Twenty-five lines that follow Salvatore's split exactly: digits become integers, allowed symbol characters become symbols, anything else is skipped. The membership test is one `strchr` call.

```c:run
#include <ctype.h>
#include <stdio.h>
#include <string.h>

static const char *sym_chars = "+-*/%";

int is_symbol_char(int c) {
    return c != 0 && (isalpha(c) || strchr(sym_chars, c) != NULL);
}

int main(void) {
    const char *src = "add 1 2 +";
    const char *p = src;
    while (*p) {
        if (*p == ' ') { p++; continue; }
        if (isdigit((unsigned char)*p)) {
            int n = 0;
            while (isdigit((unsigned char)*p)) n = n * 10 + (*p++ - '0');
            printf("int    %d\n", n);
        } else if (is_symbol_char((unsigned char)*p)) {
            const char *start = p;
            while (is_symbol_char((unsigned char)*p)) p++;
            printf("symbol %.*s\n", (int)(p - start), start);
        } else {
            p++;
        }
    }
    return 0;
}
```

```output
symbol add
int    1
int    2
symbol +
```

Three pieces to notice:

- `strchr(sym_chars, c)` is the membership test. Add a character to `sym_chars` and it's instantly accepted; you never touch the loop.
- The `c != 0` guard *is* needed despite Salvatore's aside in the video: `strchr` always finds the string's own null terminator, so without the guard `is_symbol_char(0)` would return true and the inner `while` would run off the end of the input. He keeps it "for documentation"; in fact it's load-bearing.
- `(int)(p - start)` and `%.*s` print a slice of the source without copying it - same pointer-math idea the parser uses to hand `create_symbol_object` a length.
