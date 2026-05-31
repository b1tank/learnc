---
id: 06-06-table-lookup
chapter: 6
label: "6.6"
title: 'Table Lookup with a Hash Table'
prev: ex-6-4
next: ex-6-5
status: done
---

A **hash table** answers "what value is associated with this key?" in roughly constant time, no matter how many entries it holds. The trick: run the key through a **hash function** that turns it into an array index, then store the entry in a bucket at that index. Looking up is the same: hash the key, jump straight to the bucket. When two different keys hash to the same bucket — a **collision** — we chain the entries together with the self-referential structs from the previous section. This is the data structure behind symbol tables, dictionaries, caches, and language `map`/`dict` types.

## A chained hash table

```c:run hash, install, and look up
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NHASH 101                       /* a prime: spreads keys evenly */
struct nlist { struct nlist *next; char *name; int val; };
static struct nlist *table[NHASH];      /* array of bucket-list heads */

unsigned hash(const char *s) {
    unsigned h = 0;
    for (; *s; s++) h = *s + 31 * h;    /* fold each char into h */
    return h % NHASH;                   /* squeeze into [0, NHASH) */
}

void install(char *name, int val) {     /* prepend into the right bucket */
    unsigned h = hash(name);
    struct nlist *p = malloc(sizeof *p);
    p->name = name; p->val = val;
    p->next = table[h]; table[h] = p;
}

int lookup(char *name) {                /* walk that bucket's chain */
    for (struct nlist *p = table[hash(name)]; p; p = p->next)
        if (strcmp(name, p->name) == 0) return p->val;
    return -1;                          /* not found */
}

int main(void) {
    install("red", 1); install("green", 2); install("blue", 3);
    printf("green=%d blue=%d missing=%d\n",
           lookup("green"), lookup("blue"), lookup("purple"));
    return 0;
}
```

```output
green=2 blue=3 missing=-1
```

`table` is an array of 101 bucket pointers, each the head of a linked list. `hash` reduces a string to one of those 101 indices using the classic *multiply-by-31-and-add* rolling hash (31 is an odd prime that mixes bits well). `install` hashes the name and *prepends* a new node into that bucket's chain (O(1)); `lookup` hashes the name, then walks only the handful of nodes in that one bucket, comparing with `strcmp`. Because each bucket holds just a few entries when the table is sized well, both operations are effectively constant time — vastly faster than scanning an array of all entries.

## Why it's fast, and the catches

The whole performance argument rests on the hash spreading keys *evenly* across buckets, so each chain stays short. A bad hash (or a table too small) piles many keys into one bucket, degrading lookup to O(n) — a linear scan of a long list — which is also the basis of [hash-flooding](https://en.wikipedia.org/wiki/Collision_attack#Hash_flooding) denial-of-service attacks against predictable hashes. Real implementations therefore *resize* (rehash into a bigger array) when the **load factor** (entries ÷ buckets) climbs too high, and they choose strong hash functions. A few engineering notes about this code: it stores the `name` pointer it was *given* rather than copying the string, so the caller must keep those strings alive (real code `strdup`s the key); it doesn't update an existing key (a second `install` of the same name shadows the first in the chain); and a complete version would pair `install` with a `delete`/`free`. The alternative collision strategy to chaining is **open addressing** (probe to the next empty slot in the array itself), which is more cache-friendly but trickier to delete from. Hashing is one of the highest-leverage ideas in all of programming — the same array-indexing-by-computed-key trick appears everywhere from databases to compilers.

## Go deeper
- [Hash table](https://en.wikipedia.org/wiki/Hash_table) — buckets, collisions, load factor
- [Hash function](https://en.wikipedia.org/wiki/Hash_function) — what makes a good one
- [Separate chaining vs open addressing](https://en.wikipedia.org/wiki/Hash_table#Collision_resolution) — the two strategies
- [`strcmp` / `strdup`](https://en.cppreference.com/w/c/string/byte/strcmp) — comparing and copying keys
