---
id: 19-algorithm-archaeology
chapter: 7
label: "7.4"
title: Special - recovering algorithms from memory without docs
prev: 18-string-design-and-hexdump
next: 21-opaque-types-and-files
status: draft
source:
  videoId: soiBgJjAmP8
  url: https://www.youtube.com/watch?v=soiBgJjAmP8
---

> **Source video.** [Let's Learn C - special episode](https://www.youtube.com/watch?v=soiBgJjAmP8) by Salvatore Sanfilippo (antirez).

## TL;DR

A meta-lesson, recorded after midnight and a couple of glasses of wine: Salvatore hasn't touched a Binary Search Tree in twenty years, and uses himself as a guinea pig to reconstruct one from scratch - no notes, no Google. The point isn't the BST; it's the *method*. If you remember the **invariant** of a data structure, the implementation tends to fall out on its own. Memorising code is a trap; internalising the small idea at its core is what lets you rebuild it decades later.

## The experiment `[01:32]`

Salvatore frames this as an experiment tied to a broader debate - *should interviews ask algorithmic questions at all?* His answer is yes, but only for the fundamental ideas, not for trivia. To prove the point he picks a data structure he genuinely hasn't written in two decades and rebuilds it live.

## Start from the invariant, not the code `[02:26 → 03:44]`

He doesn't try to remember "how a BST is written." He remembers one thing: **every node's left subtree holds smaller values, every right subtree holds larger ones.** That single sentence is enough to derive the struct definition (`left`, `right`, `val`), the insert logic (compare and descend), and - most importantly - the traversal that comes later. Everything else is mechanics.

## Let the structure write the code `[12:32 → 14:30]`

The most striking moment in the video. Having built the tree, he wants to print it in sorted order. He half-remembers there's "a really elegant recursive algorithm" but doesn't recall the exact form - so he derives it from the invariant in real time. Smaller things are on the left, so recurse left first; print the current node; then recurse right. That's an in-order traversal, and it falls out in three lines:

```c
void print_sorted(struct node *root) {
    if (root == NULL) return;
    print_sorted(root->left);
    printf("%d\n", root->val);
    print_sorted(root->right);
}
```

His comment on it is the heart of the episode: *"this code I didn't write, the structure of this node wrote it."* The invariant did the work. Memorising the function would have been pointless - once you internalise *left = smaller, right = larger*, you can re-derive it anywhere, in any language, at any hour.

## Test on tiny inputs `[11:25 → 11:54]`

He inserts `10, 5, 20, 100, 33`, compiles with `-Wall -Wextra`, and runs. The fastest way to catch a reconstruction bug is a five-element example you can verify by eye - not a thousand-node stress test. If it sorts five numbers correctly, the shape is probably right; you can layer edge cases on top later. The full program is reassembled below.

## Use the LLM as a second pair of eyes, not a crutch `[15:22 → 19:27]`

After the implementation works, he hands the file to Gemini and asks for a bug list. The point of the exercise was to write it without external help - but once it exists, an LLM is a cheap reviewer. It flags the duplicate-value handling (he knew), the missing `free`s (he knew), and one genuinely useful stylistic note: the `if (root->left)` guard inside `print_sorted` is redundant because the function already null-checks `root` at entry. He accepts the suggestion. The lesson: research before guessing, but verify after building.

## Know what can't be reconstructed `[21:00 → 22:23]`

He closes with honesty about the limits of the method. Some algorithms genuinely require sitting down with the paper: HyperLogLog's cardinality correction formulas, Bloom filter parameter math, anything with subtle numerical constants. The reconstruction trick works for structures whose behaviour is defined by a small invariant. It does not work for algorithms whose correctness depends on memorised constants.

## The reconstruction method, distilled

Strip away the BST and the recipe Salvatore used has four steps, in order:

1. **Recall the invariant, not the syntax.** One sentence - *left subtree smaller, right subtree larger* - is the seed. If you can state the invariant, you can regrow the code; if you can only remember the code, you have memorised a fossil.
2. **Let each operation read straight off the invariant.** Insert is "compare, then descend the matching side until you hit a `NULL` slot." In-order printing is "smaller side first, then me, then larger side." Neither needed a reference - the invariant dictated both.
3. **Verify on an input small enough to check by eye.** Five numbers expose a wrong comparison or a swapped recursion instantly; a million wouldn't tell you *where* it broke.
4. **Review after it works, not before.** A reference (or an LLM) is a reviewer once you have something to review, not a substitute for deriving it yourself.

## The whole tree, rebuilt from the invariant

Here is the complete reconstruction - the exact iterative insert and recursive in-order walk he derived, with the redundant `root->left` guard already dropped per Gemini's note. It inserts the same `10, 5, 20, 100, 33` and prints them in order:

```c:run BST reconstructed from its invariant
#include <stdio.h>
#include <stdlib.h>

struct node {
    struct node *left;
    struct node *right;
    int val;
};

/* Insert val; return the (possibly new) root. */
struct node *add(struct node *root, int val) {
    struct node *new = malloc(sizeof(*new));
    new->left = new->right = NULL;
    new->val = val;
    if (root == NULL) return new;          /* first node becomes the root */

    struct node *saved_root = root;
    while (1) {
        if (val > root->val) {             /* larger -> go right */
            if (root->right == NULL) { root->right = new; return saved_root; }
            root = root->right;
        } else {                           /* smaller-or-equal -> go left */
            if (root->left == NULL) { root->left = new; return saved_root; }
            root = root->left;
        }
    }
}

/* Smaller side, then me, then larger side: an in-order walk. */
void print_sorted(struct node *root) {
    if (root == NULL) return;
    print_sorted(root->left);
    printf("%d\n", root->val);
    print_sorted(root->right);
}

int main(void) {
    struct node *root = NULL;
    root = add(root, 10);
    root = add(root, 5);
    root = add(root, 20);
    root = add(root, 100);
    root = add(root, 33);
    print_sorted(root);
    return 0;
}
```

```output
5
10
20
33
100
```

Nothing here was memorised. The struct shape, the descend-until-`NULL` insert, and the three-line traversal all came out of the single sentence about left and right subtrees - which is exactly the point of the episode.
