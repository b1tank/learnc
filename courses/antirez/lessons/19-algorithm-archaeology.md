---
id: 19-algorithm-archaeology
chapter: 7
label: "7.4"
title: Special — recovering algorithms from memory without docs
prev: 18-string-design-and-hexdump
next: 21-opaque-types-and-files
status: draft
source:
  videoId: soiBgJjAmP8
  url: https://www.youtube.com/watch?v=soiBgJjAmP8
---

> **Source video.** [Corso di programmazione in C — episodio speciale: come resuscitare un algoritmo dalla memoria, senza documentazione](https://www.youtube.com/watch?v=soiBgJjAmP8) by Salvatore Sanfilippo.

## TL;DR

A meta-lesson, recorded after midnight and a couple of glasses of wine: Salvatore hasn't touched a Binary Search Tree in twenty years, and uses himself as a guinea pig to reconstruct one from scratch — no notes, no Google. The point isn't the BST; it's the *method*. If you remember the **invariant** of a data structure, the implementation tends to fall out on its own. Memorising code is a trap; internalising the small idea at its core is what lets you rebuild it decades later.

## Walkthrough

### The experiment `[01:32]`

Salvatore frames this as an experiment tied to a broader debate — *should interviews ask algorithmic questions at all?* His answer is yes, but only for the fundamental ideas, not for trivia. To prove the point he picks a data structure he genuinely hasn't written in two decades and rebuilds it live.

### Start from the invariant, not the code `[02:26 → 03:44]`

He doesn't try to remember "how a BST is written." He remembers one thing: **every node's left subtree holds smaller values, every right subtree holds larger ones.** That single sentence is enough to derive the struct definition (`left`, `right`, `val`), the insert logic (compare and descend), and — most importantly — the traversal that comes later. Everything else is mechanics.

### Let the structure write the code `[12:32 → 14:30]`

The most striking moment in the video. Having built the tree, he wants to print it in sorted order. He half-remembers there's "a really elegant recursive algorithm" but doesn't recall the exact form — so he derives it from the invariant in real time. Smaller things are on the left, so recurse left first; print the current node; then recurse right. That's an in-order traversal, and it falls out in three lines:

```c
void print_sorted(struct node *root) {
    if (root == NULL) return;
    print_sorted(root->left);
    printf("%d\n", root->val);
    print_sorted(root->right);
}
```

His comment on it is the heart of the episode: *"this code I didn't write, the structure of this node wrote it."* The invariant did the work. Memorising the function would have been pointless — once you internalise *left = smaller, right = larger*, you can re-derive it anywhere, in any language, at any hour.

### Test on tiny inputs `[11:25 → 11:54]`

He inserts `10, 5, 20, 100, 33`, compiles with `-Wall -Wextra`, and runs. The fastest way to catch a reconstruction bug is a five-element example you can verify by eye — not a thousand-node stress test. If it sorts five numbers correctly, the shape is probably right; you can layer edge cases on top later.

### Use the LLM as a *second pair of eyes*, not a crutch `[15:22 → 19:27]`

After the implementation works, he hands the file to Gemini and asks for a bug list. The point of the exercise was to write it without external help — but once it exists, an LLM is a cheap reviewer. It flags the duplicate-value handling (he knew), the missing `free`s (he knew), and one genuinely useful stylistic note: the `if (root->left)` guard inside `print_sorted` is redundant because the function already null-checks `root` at entry. He accepts the suggestion. The lesson: research before guessing, but verify after building.

### Know what *can't* be reconstructed `[21:00 → 22:23]`

He closes with honesty about the limits of the method. Some algorithms genuinely require sitting down with the paper: HyperLogLog's cardinality correction formulas, Bloom filter parameter math, anything with subtle numerical constants. The reconstruction trick works for structures whose behaviour is defined by a small invariant. It does not work for algorithms whose correctness depends on memorised constants.

## Try it

1. Pick a data structure you "sort of remember" — a linked list, a queue, a stack — and rebuild it from the invariant alone, without opening any reference. Time yourself.
2. Now look up the canonical version. Where did yours differ? Was your version wrong, or just *different* (iterative vs recursive, extra struct vs no struct)?
3. Hand your reconstruction to an LLM and ask "list the bugs." Treat its output the way Salvatore did: keep the good catches, discard the noise.

## Go deeper

- George Pólya, *How to Solve It* — the canonical book on rebuilding solutions from the problem statement. Pólya's "have you seen a related problem?" is exactly the move Salvatore makes here.
- Richard Hamming, *You and Your Research* (1986 lecture) — on why deeply internalised fundamentals beat memorised technique, and why the people who do durable work tend to re-derive things rather than look them up.
- antirez, [*Writing system software: code comments*](http://antirez.com/news/124) — same author, same instinct: optimise for the reader (including future-you) who is reconstructing intent from a small number of strong signals.
- Donald Knuth, *Literate Programming* — the opposite end of the spectrum: code as the *primary* documentation of an algorithm. Useful to contrast with the "rebuild from memory" approach.

*Click **next →** to return to the main thread: opaque types, typedefs, and splitting code across files.*
