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

> **Source video.** [Let's Learn C - lesson 15](https://www.youtube.com/watch?v=aTT2W5NACEY) by Salvatore Sanfilippo (antirez).

## TL;DR

A struct that contains a pointer to its own kind - `struct node { ...; struct node *next; }` - is the seed of every linked data structure in C: lists, stacks, trees, graphs. The recursive *name* must spell out `struct node` (the tag), because at the point the field is declared the `typedef`, if any, doesn't exist yet.

## Reversing a file with a linked list `[00:00 → 15:32]`

The motivating exercise is `tac`: print a file's lines last-first, the inverse of `cat`. The data structure that makes this trivial is a **singly-linked list** built out of self-referential structs - a struct that holds a pointer to its own kind:

```c
struct line {
    char *s;
    struct line *next;   /* same type, by tag */
};
```

You cannot write `line *next` here - at the point this field is declared `line` is still being defined, so any later `typedef` does not exist yet. The **tag** `struct line` is the only name available, and that is exactly what self-reference is for. Read one line into a fresh node, splice it onto the front, and the most recently read line ends up first - so walking from the head visits lines in reverse. That is `tac`, essentially for free.

## Push-front builds the list in reverse `[15:42 → 21:10]`

Keep a `head` pointer starting at `NULL`. For every new node: `malloc` it, set `node->next = head`, then `head = node`. The new node always lands in front, so walking from `head` and chasing `next` visits items in reverse insertion order.

Here is the smallest version: push `1`, `2`, `3` onto an empty list, then iterate from the head.

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

    /* Free every node - malloc gave you the memory, only free returns it. */
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

Notice `sizeof *n` (the size of *what `n` points to*) instead of `sizeof(struct node)` - it stays correct if you ever rename the type. And notice the second walk to `free` every node: forgetting that step is the canonical C memory leak.

## Reaching the file: `argc`, `argv`, and `fopen` `[02:50 → 11:15]`

The real `tac` reads its filename from the command line. `main` can take two parameters: `argc`, the argument count, and `argv`, an array of `char *` - one string per argument, with `argv[0]` the program name itself.

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

So `tac` checks `argc == 2`, takes the name from `argv[1]`, and opens it with `fopen(argv[1], "r")`, which hands back a `FILE *` or `NULL` when the file is not there. From there `fgets(buf, sizeof buf, fp)` pulls one line per call until it returns `NULL` at end of file - each line becomes a `struct line` spliced onto the front of the list, and `fclose(fp)` releases the file when you are done.

## Memory is concrete, the structure is abstract `[24:10]`

This is the decisive step. You stop caring *where* nodes live. `malloc` scatters them across the heap at addresses you never look at; the `next` pointers stitch them into a logical sequence you *can* reason about - first, second, third - with a known cost (O(n) to build, O(n) to walk). The same trick gives you trees (`left`/`right` pointers), graphs (an array of `next`-style pointers), and hash-table buckets. Memory is concrete; the structure laid over it is abstract, and that abstraction is one of C's load-bearing ideas.

## How `next` threads heap nodes together

Each `malloc` returns a node at some address you do not choose; the only thing tying the nodes into a list is that each node's `next` field stores the address of another node. With push-front, `n->next` is set to the *current* head - i.e. the node pushed just before it - so the chain literally records "the previous node" at every link:

```c:run thread
#include <stdio.h>
#include <stdlib.h>

struct node {
    int value;
    struct node *next;
};

int main(void) {
    printf("sizeof(struct node) = %zu\n", sizeof(struct node));

    struct node *head = NULL;
    struct node *prev = NULL;
    for (int v = 1; v <= 3; v++) {
        struct node *n = malloc(sizeof *n);
        n->value = v;
        n->next = head;        /* new node points back at the old head */
        printf("push %d: n->next points at the node pushed before it: %s\n",
               v, n->next == prev ? "yes" : "no");
        prev = n;
        head = n;
    }

    printf("walk:");
    for (struct node *p = head; p; p = p->next)
        printf(" %d", p->value);
    putchar('\n');

    while (head) { struct node *t = head->next; free(head); head = t; }
    return 0;
}
```

```output
sizeof(struct node) = 16
push 1: n->next points at the node pushed before it: yes
push 2: n->next points at the node pushed before it: yes
push 3: n->next points at the node pushed before it: yes
walk: 3 2 1
```

The node is 16 bytes - an 8-byte `int` slot (padded up from 4, the alignment rule from the previous lesson) plus an 8-byte pointer. The first push links to `NULL` (there was no previous node), and from then on every `next` records the address of its predecessor. Following those links from the head is the walk, and because each push prepended, the walk comes out reversed. A chain has no length field: the only way to count it, or to `free` it, is to start at the head and follow `next` to the end - which is why the build loop's `malloc`s must be matched by a second traversal that frees every node, or they leak.
