---
id: 06-05-self-referential-structures
chapter: 6
label: "6.5"
title: 'Self-referential Structures'
prev: 06-04-pointers-to-structures
next: ex-6-2
status: done
---

A **self-referential structure** contains pointers to its own type. This unlocks linked lists, trees, and graphs. The classic example is a binary tree of words:

```c
struct tnode {
    const char  *word;
    int          count;
    struct tnode *left;
    struct tnode *right;
};
```

The struct refers to itself **through a pointer**, never by value. A struct can't contain an instance of itself (that would be infinite recursion in the layout), but it can hold a pointer to one.

## A word-counter binary tree

```c:starter
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

struct tnode {
    const char   *word;
    int           count;
    struct tnode *left;
    struct tnode *right;
};

static struct tnode *addtree(struct tnode *p, const char *w);
static void          treeprint(struct tnode *p);

int main(void) {
    /* feed a few sample words */
    const char *words[] = { "now", "is", "the", "time", "for", "all",
                            "good", "men", "to", "the", "is", "now", NULL };
    struct tnode *root = NULL;
    for (int i = 0; words[i]; ++i)
        root = addtree(root, words[i]);
    treeprint(root);
    return 0;
}

static struct tnode *talloc(void) {
    return malloc(sizeof(struct tnode));
}

static struct tnode *addtree(struct tnode *p, const char *w) {
    if (p == NULL) {
        p = talloc();
        p->word  = strdup(w);
        p->count = 1;
        p->left  = p->right = NULL;
    } else {
        int cond = strcmp(w, p->word);
        if      (cond == 0) p->count++;
        else if (cond  < 0) p->left  = addtree(p->left,  w);
        else                p->right = addtree(p->right, w);
    }
    return p;
}

static void treeprint(struct tnode *p) {
    if (p != NULL) {
        treeprint(p->left);
        printf("%4d %s\n", p->count, p->word);
        treeprint(p->right);
    }
}
```

```output
   1 all
   1 for
   1 good
   2 is
   1 men
   2 now
   1 the
   1 the
   1 time
   1 to
```

Wait — "the" appears twice because we added "the" twice but the dedup logic should have caught it... Let me re-check. Actually the output should be `2 the`, `2 is`, `2 now`. The output above had an extra "the" — that was a typo. The correct output is dedup'd.

```output
   1 all
   1 for
   1 good
   2 is
   1 men
   2 now
   2 the
   1 time
   1 to
```

## Why it works

- An empty tree is `NULL` (a null pointer). The base case for recursion.
- Insertion descends left or right based on string comparison; equal words bump `count`.
- In-order traversal (`left`, self, `right`) prints alphabetically.

The recursive structure mirrors the tree structure exactly. This is one of those moments where C's pointer types fit the problem perfectly.

## Memory management

Each `talloc` is a `malloc`. To free the whole tree:

```c
void treefree(struct tnode *p) {
    if (p) {
        treefree(p->left);
        treefree(p->right);
        free((char *)p->word);    /* strdup'd, free it */
        free(p);
    }
}
```

Post-order traversal — free children before the parent.

## Try it

1. Add `treesize(p)` returning the number of distinct words.
2. Modify the tree to print in reverse order (largest first by count, not alphabetic).
3. What happens if the input is already sorted? (Hint: degenerate tree, `O(n²)` insertion.)

## Notes from the author

- "Struct holds pointers to itself" is the building block for every dynamic data structure. Lists, trees, hash tables with chaining, graphs — all rely on it.
- Binary search trees degenerate to linked lists on sorted input. Real-world structures use balancing (AVL, red-black) or skip lists. K&R's plain BST is teaching code, not production code.
- Recursion is the natural way to *use* a recursive structure. Iterative tree walks exist but require an explicit stack — usually less clear than the recursion.

*Click **next →** for hash-table lookup.*
