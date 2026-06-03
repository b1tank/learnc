---
id: 07-if-goto-recursion
chapter: 3
label: "3.1"
title: if, goto, and recursion
prev: 06-chars-and-strings
next: 08-while-for-switch
status: draft
source:
  videoId: lc7aYXNl1T8
  url: https://www.youtube.com/watch?v=lc7aYXNl1T8
---

> **Source video.** [Impariamo il C — lezione 6: IF, GOTO e ricorsione](https://www.youtube.com/watch?v=lc7aYXNl1T8) by Salvatore Sanfilippo.

## TL;DR

C's control flow is small. `if`/`else` picks a branch, `goto label;` jumps to a named point, and a function may call itself. The loop keywords (`while`, `for`, `do-while`) are sugar — every one of them desugars to an `if` plus a `goto` underneath.

## Walkthrough

### `if`, `else`, and blocks `[02:29 → 04:11]`

`if (cond) { ... } else { ... }` — the condition lives in parentheses, each branch is a *block* in curly braces, and `else` is optional. If a branch is a single statement the braces are optional too: `if (i > 3) printf("big\n");` is legal. Indentation does **not** mean anything to the compiler — it scans for the `if`, skips whitespace, finds the next statement, done. `[06:42 → 07:38]` Every coherent style is fine; pick one and stop arguing about it on the internet.

### Blocks scope variables `[07:38 → 09:23]`

A block doesn't have to follow an `if` — you can drop `{ ... }` anywhere a statement is allowed, and any variables you declare inside it live and die with the block. Shadowing an outer name is legal:

```c
int i = 8;
{
    int i = 5;
    printf("%d\n", i);   // 5 — the inner one
}
printf("%d\n", i);       // 8 — the outer one
```

The two `i`s sit at different stack addresses, and the compiler is even free to reuse the same slot for two *sibling* inner blocks, since the outside code is forbidden from peeking in anyway. `[14:24 → 15:42]`

### `goto` and labels `[16:22 → 19:17]`

A label is an identifier followed by a colon. `goto label;` jumps to it unconditionally. Labels must start with a letter — you cannot literally write `goto 10`, but `goto L10` is fine, which lets you fake BASIC if the mood strikes. The honest use of `goto` is to build a loop by hand:

```c:run count-with-goto.c
#include <stdio.h>

int main(void) {
    int i = 0;
again:
    printf("%d\n", i);
    i++;
    if (i < 10) goto again;
    return 0;
}
```

```output
0
1
2
3
4
5
6
7
8
9
```

That is exactly what `while (i < 10) { ... }` compiles to: a label at the top, the body, an `if` that jumps back, and an implicit fall-through past the end when the condition finally fails. `[22:38 → 23:20]`

### Recursion is a third option `[26:35 → 28:44]`

A function may also call itself. Give it a base case (an `if` that returns) and a step that shrinks the problem, and the nested calls unwind into the same pattern a loop would walk — no mutable counter, no `goto`:

```c:run factorial.c
#include <stdio.h>

int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main(void) {
    printf("%d\n", fact(6));
    return 0;
}
```

```output
720
```

The price is stack memory: every call allocates a fresh frame with its own parameters and locals. Print `&n` from inside `fact` and you'll see the addresses march downward by tens of bytes per level. `[29:22 → 30:37]` A plain loop reuses one slot; this version uses one per level of depth — fine for `n = 6`, less fine for `n = 1_000_000`. The next lesson picks up *tail call optimisation*, the trick that lets a compiler turn certain recursive shapes back into a loop.

## Try it

1. Replace `if (i < 10) goto again;` with `if (i != 10) goto again;` — same output for `i = 0`, but think about what happens if `i` starts at `15`.
2. Add `printf("%p\n", (void*)&n);` as the first line of `fact` and watch the addresses change with depth.
3. Rewrite `fact` as a `while` loop and confirm the output is identical for `n = 6`.

## Cross-reference to K&R

[K&R § 3.2 — If-Else](../../kr/lessons/03-02-if-else.md) covers the conditional itself; [K&R § 4.10 — Recursion](../../kr/lessons/04-10-recursion.md) treats recursive functions, with the canonical "print an integer digit by digit" example. K&R discusses `goto` only briefly in [§ 3.8 — Goto and Labels](../../kr/lessons/03-08-goto-and-labels.md), and like Salvatore here, mostly to say *you almost never need it*.

## Go deeper

- [cppreference: `if` statement](https://en.cppreference.com/w/c/language/if) — the full grammar, including the rules around dangling `else`.
- [cppreference: `goto` statement](https://en.cppreference.com/w/c/language/goto) — scoping rules and why you cannot jump *into* a block past a variable declaration.
- Knuth, *Structured Programming with go to Statements* (1974) — the paper that put `goto` in its place without banning it outright.
- *The C Programming Language*, 2nd ed., §3.8 and §4.10 — K&R's own treatment of `goto` and recursion.
