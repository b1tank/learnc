---
id: 16-structs-as-data-structure-bricks
chapter: 7
label: "7.1"
title: Structs as the building blocks of data structures
prev: 15-structs-of-c
next: 17-strings-with-reference-counting
status: draft
source:
  videoId: aTT2W5NACEY
  url: https://www.youtube.com/watch?v=aTT2W5NACEY
---

> **Source video.** [Let's Learn C — lesson 15](https://www.youtube.com/watch?v=aTT2W5NACEY) by Salvatore Sanfilippo (antirez).

## TL;DR

A struct that contains a pointer to its own kind — `struct node { ...; struct node *next; }` — is the seed of every linked data structure in C: lists, stacks, trees, graphs. The recursive *name* must spell out `struct node` (the tag), because at the point the field is declared the `typedef`, if any, doesn't exist yet.

## Walkthrough

- `[00:00]` The motivating exercise: reimplement `tac` (cat in reverse). Read lines from a file with `fgets`, then print them last-first. The data structure that makes this trivial is a **singly-linked list** built out of self-referential structs.
- `[14:22]` The shape that unlocks everything:
  ```c
  struct line {
      char *s;
      struct line *next;   /* same type, by tag */
  };
  ```
  You cannot write `line *next` here — at this point `line` is being defined, so any later `typedef` doesn't exist yet. The **tag** `struct line` is the only name available, and that's exactly what self-reference is for.
- `[15:42]` Push-front trick. Keep a `head` pointer, start it at `NULL`. For every new node: `malloc`, set `node->next = head`, then `head = node`. The most recently inserted element ends up at the front — which means walking from `head` and chasing `next` visits items in **reverse** insertion order. That's why this gives you `tac` essentially for free.
- `[24:10]` The abstraction leap. You stop caring *where* nodes live. `malloc` scatters them across the heap; the `next` pointers stitch them into a logical sequence. The same trick gives you trees (`left`/`right` pointers), graphs (an array of `next`-style pointers), hash table buckets, and so on. Memory is concrete, the structure laid over it is abstract — and that abstraction is one of C's load-bearing ideas.

Here's the smallest version: push `1`, `2`, `3` onto an empty list, then iterate from the head. Because each `push` puts the new node *in front*, the walk prints them in reverse insertion order.

```c:run linked-list-push
#include <stdio.h>
#include <stdlib.h>

struct node {
    int value;
    struct node *next;
};

static struct node *push(struct node *head, int value) {
    struct node *n = malloc(sizeof *n);
    n->value = value;
    n->next = head;
    return n;
}

int main(void) {
    struct node *head = NULL;
    head = push(head, 1);
    head = push(head, 2);
    head = push(head, 3);

    for (struct node *p = head; p; p = p->next) {
        printf("%d", p->value);
        putchar(p->next ? ' ' : '\n');
    }

    /* Free every node — malloc gave you the memory, only free returns it. */
    while (head) {
        struct node *next = head->next;
        free(head);
        head = next;
    }
    return 0;
}
```

```output
3 2 1
```

Notice `sizeof *n` (the size of *what `n` points to*) instead of `sizeof(struct node)` — it stays correct if you ever rename the type. And notice that you have to walk the list a second time to `free` every node: forgetting that step is the canonical C memory leak.

### Reaching the file: `argc`, `argv`, and `fopen` `[02:50 → 11:15]`

The real `tac` reads its filename from the command line. `main` can take two parameters: `argc`, the argument count, and `argv`, an array of `char *` — one string per argument, with `argv[0]` the program name itself.

```c
#include <stdio.h>

int main(int argc, char **argv) {
    for (int i = 0; i < argc; i++)
        printf("%d %s\n", i, argv[i]);
    return 0;
}
```

```
./a.out foo bar
```

```output
0 ./a.out
1 foo
2 bar
```

So `tac` checks `argc == 2`, takes the name from `argv[1]`, and opens it with `fopen(argv[1], "r")`, which hands back a `FILE *` or `NULL` when the file isn't there:

```
./a.out test.nonexistent
```

```output
File does not exist
```

From there `fgets(buf, sizeof buf, fp)` pulls one line per call until it returns `NULL` at end of file — each line becomes a `struct line` spliced onto the front of the list.

## Modern note

The Linux kernel uses an **intrusive** variant: instead of giving every list its own node type, you embed a small `struct list_head { struct list_head *next, *prev; }` *inside* your data struct, and a `container_of` macro walks back from the embedded field to the outer object. Same self-referential idea, zero extra allocation per element. See `include/linux/list.h` if you want to see this pattern at industrial scale.

## Try it

1. Add `static int len(struct node *head)` that returns the list length. Predict the output for the 3-element list before running.
2. Push 1000 nodes in a loop, then *remove* the `free` pass. Run under `valgrind ./a.out` locally and read the leak report — every leaked node is a real bug.
3. Replace the `for` walk with a recursive `void print(struct node *p)` that prints in *original* insertion order (hint: print *after* the recursive call).

## Cross-reference to K&R

[K&R § 6.5 — Self-Referential Structures](../../kr/lessons/06-05-self-referential-structures.md) introduces the exact same pattern and uses it to build a binary search tree that counts word frequencies — the natural next step after a linked list.

## Go deeper

- Linux kernel `include/linux/list.h` — the famous intrusive `list_head` macros and `container_of` trick.
- *Doubly-linked lists* — add a `prev` pointer alongside `next`. Costs one word per node, buys you O(1) deletion when you already hold a pointer to the victim.
- Donald Knuth, *The Art of Computer Programming* vol. 1 §2.2 — the canonical (and surprisingly readable) treatment of linked allocation.
- `valgrind --leak-check=full` — for every `malloc` without a matching `free`, valgrind names the file and line. Catching your first real leak with it is a small life event.

*Click **next →** to bolt reference counting onto the string library.*
