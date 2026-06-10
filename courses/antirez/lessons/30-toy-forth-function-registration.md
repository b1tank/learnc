---
id: 30-toy-forth-function-registration
chapter: 9
label: "9.6"
title: Toy Forth - registering functions (part 5)
prev: 29-toy-forth-exec-internals
next: 31-reference-counting-deep-dive
status: draft
source:
  videoId: C4AHEK3fSjg
  url: https://www.youtube.com/watch?v=C4AHEK3fSjg
---

> **Source video.** [Let's Learn C - lesson 27](https://www.youtube.com/watch?v=C4AHEK3fSjg) by Salvatore Sanfilippo (antirez).

## TL;DR

The interpreter needs a **dictionary** mapping word names to their implementations. We grow `context->funcTable` with `TFFuncEntry { name, callback, userFunc }`, where `name` is itself a string object so we can compare and refcount it uniformly. `registerFunction` either appends a fresh entry or overwrites an existing one; user-defined words go on the same table, just with `callback == NULL` and a body list in `userFunc`.

## Walkthrough

### Names are string objects, not raw `char *` `[07:30 → 09:33]`

The temptation is `getFunctionByName(ctx, const char *)`. Salvatore backs out of it: every other identifier in the interpreter is already a `TFObject` of type string, and the lookup will eventually be called with names parsed from program text. So even when C code registers a built-in, it wraps the literal: `TFObject *oname = createStringObject(name, strlen(name))` - register, then `release(oname)`. The reference count carries the name across the boundary.

### `compareStringObject`: ternary + `memcmp` + length tiebreak `[12:35 → 18:31]`

Lookup needs string equality on raw bytes (no Unicode, no locale). The function returns `-1 / 0 / +1`:

1. `size_t minLen = a->str.len < b->str.len ? a->str.len : b->str.len;` - the ternary picks the shorter length so `memcmp` stays in bounds.
2. `memcmp(a->str.ptr, b->str.ptr, minLen)` compares the common prefix.
3. If the prefix is equal, the longer string wins; if it isn't, the sign of the `memcmp` result wins, normalised to `±1`.

Salvatore notes this is a textbook case where pasting the function into Claude/ChatGPT to ask *"is this correct?"* is the right move - not because he can't read it, but because reviewing your own logic line by line is exhausting and the LLM is cheap.

### `registerFunction`: append or overwrite `[22:03 → 28:55]`

Two paths:

- **Already there.** `getFunctionByName` returned non-NULL. If the existing entry was a user word, `release(fe->userFunc)` and set it to NULL - otherwise leak. Then install the new callback.
- **Not there.** `xrealloc` the table by one pointer, `xmalloc` a fresh `TFFuncEntry`, slot it at `funcTable[funcCount++]`, `retain(name)`, and zero both `callback` and `userFunc`. The caller fills in whichever of the two it owns.

The `retain` on `name` is the subtlety: the caller will `release` its temporary `oname` right after `registerFunction` returns. Without the retain the refcount drops to zero and the entry's name pointer dangles. With it, the entry holds the last reference.

### When the compiler falls back to `int` `[31:48 → 33:47]`

The callback type names `TFContext` before that struct is fully visible, so the first compile fails - and the giveaway is that C, not knowing the type, *defaults it to `int`*, which then clashes with the real pointer type:

```output
toyforth.c: warning: type defaults to 'int' ...
toyforth.c: error: ... incompatible function pointer types ...
```

The fix is a forward declaration. A pointer to a struct is just an 8-byte address, so the compiler needs only a promise that the name *is* a struct, not its fields:

```c
struct TFContext;   /* forward declaration: a pointer to it is just an address */
```

With that one line above the callback type, the cascade of "defaults to int" errors disappears.

### Built-ins dispatch by the first byte of the name `[37:35 → 43:08]`

`basicMathFunction` is the C callback registered four times - for `+`, `-`, `*`, `/`. It calls `checkStackMinLen(ctx, 2)`, then a *typed* peek/pop: `stackPop(ctx, TFObjectTypeInt)` returns NULL on a type mismatch and sets the runtime error in the context. The operation itself is a `switch (name->str.ptr[0])` - the same callback handles all four operators because the name *is* the operator.

The same scaffolding will host user-defined words next episode: `registerUserFunction(ctx, name, body_list)` reuses `registerFunction` and fills in `userFunc` instead of `callback`. `callSymbol` will branch on which field is non-NULL - C call vs. recursive `exec`.

## A minimal dictionary in C

A linked list of `{ name, fn }` is the smallest thing that captures the idea. Register `square`, then execute `5 square`:

```c:run
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int stk[16];
static int sp = 0;
static void push(int v) { stk[sp++] = v; }
static int  pop(void)   { return stk[--sp]; }

typedef void (*word_fn)(void);
typedef struct entry { const char *name; word_fn fn; struct entry *next; } entry;
static entry *dict = NULL;

static void define(const char *name, word_fn fn) {
    entry *e = malloc(sizeof *e);
    e->name = name; e->fn = fn; e->next = dict; dict = e;
}
static word_fn lookup(const char *name) {
    for (entry *e = dict; e; e = e->next)
        if (strcmp(e->name, name) == 0) return e->fn;
    return NULL;
}

static void square(void) { int x = pop(); push(x * x); }

int main(void) {
    define("square", square);
    push(5);
    lookup("square")();
    printf("%d\n", pop());
    return 0;
}
```

```output
25
```

Real Toy Forth swaps three things in: `strcmp` becomes `compareStringObject` (length-prefixed strings, no NUL assumption), the list becomes a reallocated array with a `funcCount`, and each entry carries *both* a C callback and a user-function body so user-defined words live in the same table.

## Try it

1. Add a second word `double_it` (`push(pop() * 2)`) and execute `3 double_it square` by hand - predict the top of stack before running.
2. Make `define` *override* when the name already exists, instead of shadowing it via list order. (Walk the list first; if found, replace `fn`.)
3. Change `entry::name` to hold a heap-allocated copy (`strdup(name)`) and add a corresponding `free` in a teardown function. This mirrors the `retain` / `release` dance in the real interpreter.

## Cross-reference to K&R

[K&R § 6.6 - Table Lookup](../../kr/lessons/06-06-table-lookup.md) builds essentially this dictionary - a hash table of name → definition with `install` and `lookup` - for the macro processor in chapter 6. The reference-counted string objects here are a thin layer on top of the same idea; the underlying lookup-or-install pattern is identical.

## Go deeper

- Forth itself stores the dictionary as a *linked list of words*, each with a `link` field pointing to the previously-defined word. Newer definitions shadow older ones automatically - exactly what the `square`-then-redefine variant in *Try it* simulates.
- The "name is a first-class object you can `retain`" pattern is how Objective-C selectors, Python interned strings, and Lua's `TString` all work. Once strings are cheap to compare and own, dispatch tables stop feeling like C.
- `dlsym(3)` is the OS-level cousin: a runtime lookup of a symbol name to a function pointer, against the process's loaded libraries instead of an interpreter table.
