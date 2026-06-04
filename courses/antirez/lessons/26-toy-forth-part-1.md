---
id: 26-toy-forth-part-1
chapter: 9
label: "9.2"
title: Writing the Toy Forth interpreter (part 1)
prev: 25-function-pointers
next: 27-toy-forth-part-2
status: draft
source:
  videoId: vYODKK8TQGE
  url: https://www.youtube.com/watch?v=vYODKK8TQGE
---

> **Source video.** [Let's Learn C — lesson 23](https://www.youtube.com/watch?v=vYODKK8TQGE) by Salvatore Sanfilippo (antirez).

## TL;DR

Forth is a **stack-based** language: a program is a sequence of *words*, and every word either pushes a value onto a global data stack or consumes values from its top. `5 5 +` pushes two fives and `+` pops them and pushes `10`. Part 1 is a planning episode — Salvatore designs the object model (`tfobj` with a tagged union for int/string/bool/list/symbol), sketches the parser context, and writes the allocation helpers. No interpreter yet; just the bricks.

## Walkthrough

### What a stack language looks like `[01:58 → 05:22]`

A Forth program is a list of *words*. Literals push themselves; function words pop their arguments from the top of the stack and push their result back. `5 DUP` leaves `[5 5]`; `5 DUP +` leaves `[10]`. There is one global *data stack* shared by every word. This is **postfix** / **RPN** notation — the operator always comes after its operands.

### Control flow is just more words `[06:24 → 10:54]`

Even `if` is a regular word. The convention Salvatore picks: `[cond] [then] [else] if`. The square brackets are *quoted sublists* — values that happen to be programs. `if` pops three list values, executes the condition list, then executes either the then- or else-list depending on the boolean left on the stack. The same data type ("list of objects") represents both data and code.

### One tagged object for everything `[11:37 → 14:46]`

The central type is a `struct tfobj` carrying a `type` field and an anonymous `union` of payloads — int, string (`{char *ptr; size_t len;}`), bool (reuses the int), list (`{tfobj **ele; size_t len;}`), and symbol (reuses the string). Two structural touches: a `refcount` for reference-counted memory (the trick from lesson 16), and a `list` whose elements are *pointers to* `tfobj`, so the type can hold itself recursively. A program is a `tfobj` of type list.

### Why symbols are not strings `[18:09 → 19:14]`

`DUP` in source isn't a string literal — it's a **symbol**. Tokens that aren't between quotes and aren't pure numbers are tagged `TFOBJ_TYPE_SYMBOL`, and at execution time the interpreter looks them up in a name→function table (next episode) instead of pushing them. The storage shape happens to be the same as a string (pointer + length), so `createSymbolObject` is one line that calls `createStringObject` and rewrites the type.

### Allocation discipline `[28:30 → 32:42]`

Before any logic, Salvatore writes `createObject(int type)`, plus a `createXxxObject` per type. Each starts `refcount = 1` (the returned pointer is the first reference). Every `malloc` goes through an `xmalloc` wrapper that prints `"Out of memory"` and `exit(1)` on `NULL` — it lets the rest of the code stop checking. A useful rule of thumb for non-library programs: panic at the allocation site, keep the call sites readable.

## A miniature data stack

The whole interpreter rests on this: pushes append, pops take from the end. Here is a 25-line skeleton — same shape as what `tfobj` of list type will become next week, only specialised to `int`.

```c:run
#include <stdio.h>

#define MAX 16

typedef struct {
    int data[MAX];
    int len;
} Stack;

void push(Stack *s, int x) { s->data[s->len++] = x; }
int  pop(Stack *s)         { return s->data[--s->len]; }

int main(void) {
    Stack s = {0};
    push(&s, 1);
    push(&s, 2);
    push(&s, 3);
    while (s.len > 0) {
        printf("%d%s", pop(&s), s.len ? " " : "\n");
    }
    return 0;
}
```

```output
3 2 1
```

LIFO is the whole point: the last value in is the first out. In the real interpreter `data` will be `tfobj **` and `MAX` will grow via `realloc`, but the push/pop pair stays exactly this shape. Implementing `+` is then `int b = pop(s), a = pop(s); push(s, a + b);` — read right-to-left, exactly as the source reads left-to-right.

## Modern note

The family Forth belongs to is called **concatenative**: programs are sequences of functions that thread an implicit stack, and *juxtaposition* is composition. Joy, Factor, and PostScript are direct descendants; the JVM and CPython bytecodes are stack machines internally for the same reason — no register allocation, trivial evaluator loop. Forth itself dates to the 1970s (Chuck Moore) and is still used in embedded firmware and bootloaders (Open Firmware, U-Boot) because a working interpreter fits in a few KB.

## Try it

1. On paper, draw the stack contents after each word of `1 2 3 + +`. What's the final value?
2. Predict what `1 2 3 dup swap drop` leaves on the stack (`dup` copies the top, `swap` exchanges the top two, `drop` discards the top).
3. Extend the C above with an `add` helper that pops two ints, pushes their sum, and use it to compute `5 + 7` through the stack.

## Cross-reference to K&R

[K&R § 6.1 — Basics of Structures](../../kr/lessons/06-01-basics-of-structures.md) is exactly the toolkit Salvatore is reaching for here: declaring a `struct`, naming its members, allocating one, accessing fields through `->`. K&R's own running example in the chapter is — appropriately — a stack-based calculator (§ 4.3), the same idea built without a tagged union.

## Go deeper

- *Starting Forth* by Leo Brodie — the classic, free online (<https://www.forth.com/starting-forth/>). The best introduction to the *language*, separate from any implementation.
- *JONESFORTH* by Richard Jones — a literate Forth implementation in ~2000 lines of x86 assembly and Forth itself, with line-by-line commentary. Eye-opening for how small a real Forth can be.
- The Wikipedia entry on [concatenative programming](https://en.wikipedia.org/wiki/Concatenative_programming_language) — places Forth in the wider family (Joy, Factor, Cat).

*Click **next →** for part 2, where the parser turns source text into a `tfobj` list.*
