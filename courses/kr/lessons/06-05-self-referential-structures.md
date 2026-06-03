---
id: 06-05-self-referential-structures
chapter: 6
label: "6.5"
title: 'Self-referential Structures'
prev: 06-04-pointers-to-structures
next: ex-6-2
status: done
---

A structure can contain a **pointer to its own type** — `struct node { int val; struct node *next; };`. A struct can't contain *itself* by value (that would be infinitely large), but it can hold a pointer to another struct of the same kind. This single idea is the foundation of every **linked data structure**: linked lists, binary trees, graphs. Instead of storing elements in one contiguous block like an array, you scatter individual nodes anywhere in memory and thread them together by address, which makes inserting and deleting cheap.

## Building a linked list

```c:run nodes linked by self-pointers
#include <stdio.h>
#include <stdlib.h>

struct node { int val; struct node *next; };   /* points to its own type */

int main(void) {
    struct node *head = NULL;                   /* empty list */
    for (int i = 3; i >= 1; i--) {              /* prepend 3, then 2, then 1 */
        struct node *n = malloc(sizeof *n);     /* allocate one node */
        n->val  = i;
        n->next = head;                         /* link it in front */
        head    = n;                            /* it becomes the new head */
    }
    for (struct node *p = head; p; p = p->next) /* walk until NULL */
        printf("%s%d", p == head ? "" : " -> ", p->val);
    printf("\n");
    return 0;
}
```

```output
1 -> 2 -> 3
```

Each `malloc(sizeof *n)` carves a fresh node out of the [heap](https://en.wikipedia.org/wiki/Memory_management#HEAP) and returns its address. Prepending is two pointer assignments: point the new node's `next` at the current head, then make the new node the head — O(1), no shifting of other elements. Traversal is the canonical idiom `for (p = head; p != NULL; p = p->next)`: follow the chain of `next` pointers until you hit the `NULL` that marks the end. The list prints `1 -> 2 -> 3` because we prepended in the order 3, 2, 1. Note `sizeof *n` (the size of the *pointed-to* node) is the idiomatic argument to `malloc` — it stays correct even if the struct type changes.

## Why linked, and what it costs

Linked structures trade away the array's strengths for different ones. Inserting or deleting in the middle of a linked list is O(1) once you hold the spot (just rewire two pointers) — no mass shifting — and the structure can grow one node at a time without ever reallocating and copying the whole thing. The price: you **lose random access** (reaching the i-th element means walking i links, O(n)), each node costs an extra pointer of memory, and the nodes are scattered across the heap rather than packed contiguously, so traversal suffers more [cache misses](https://en.wikipedia.org/wiki/CPU_cache) than marching through an array. There's also a responsibility arrays-on-the-stack don't have: every `malloc` must eventually be matched by a `free`, or the program **leaks memory** — for a list you free node by node, capturing `next` *before* freeing each node (freeing first would leave you holding a dangling pointer). Self-referential structs generalize directly: give a node *two* child pointers and you have a binary tree; give it a list of pointers and you have a graph.

## Go deeper
- [Linked list](https://en.wikipedia.org/wiki/Linked_list) — operations and trade-offs
- [`malloc`/`free`](https://en.cppreference.com/w/c/memory/malloc) — heap allocation
- [Memory leak](https://en.wikipedia.org/wiki/Memory_leak) — the cost of forgetting `free`
- [The heap](https://en.wikipedia.org/wiki/Manual_memory_management) — where nodes live
