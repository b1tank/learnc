---
id: 06-06-table-lookup
chapter: 6
label: "6.6"
title: 'Table Lookup with a Hash Table'
prev: ex-6-4
next: ex-6-5
status: done
---

A hash table maps strings to data in (amortised) `O(1)` time. K&R's example is a "name → definition" lookup, the kind used inside a preprocessor.

The structure:

```c
struct nlist {
    struct nlist *next;     /* chain for collisions */
    const char   *name;
    const char   *defn;
};

#define HASHSIZE 101
static struct nlist *hashtab[HASHSIZE];
```

`hashtab` is an array of pointers, one per bucket. Each bucket holds a (possibly empty) linked list of entries that hashed to that bucket.

## Putting it together

```c:starter
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define HASHSIZE 101

struct nlist {
    struct nlist *next;
    char *name;
    char *defn;
};

static struct nlist *hashtab[HASHSIZE];

/* polynomial-rolling hash: hash * 31 + c */
static unsigned hash(const char *s) {
    unsigned h = 0;
    while (*s) h = 31u * h + (unsigned char)*s++;
    return h % HASHSIZE;
}

static struct nlist *lookup(const char *name) {
    for (struct nlist *p = hashtab[hash(name)]; p; p = p->next)
        if (strcmp(name, p->name) == 0)
            return p;
    return NULL;
}

static struct nlist *install(const char *name, const char *defn) {
    struct nlist *np = lookup(name);
    if (np == NULL) {       /* new */
        np = malloc(sizeof *np);
        if (!np) return NULL;
        np->name = strdup(name);
        unsigned h = hash(name);
        np->next = hashtab[h];
        hashtab[h] = np;
    } else {
        free(np->defn);
    }
    np->defn = strdup(defn);
    return np;
}

int main(void) {
    install("MAX", "100");
    install("PI",  "3.14");
    install("NAME","yummy");
    install("MAX", "200");   /* update */

    const char *keys[] = { "MAX", "PI", "NAME", "MISSING", NULL };
    for (int i = 0; keys[i]; ++i) {
        struct nlist *p = lookup(keys[i]);
        printf("%-8s -> %s\n", keys[i], p ? p->defn : "(not found)");
    }
    return 0;
}
```

```output
MAX      -> 200
PI       -> 3.14
NAME     -> yummy
MISSING  -> (not found)
```

## How the chaining works

When two keys hash to the same bucket, `install` prepends the new entry to the linked list:

```c
np->next = hashtab[h];   /* old list becomes our "next" */
hashtab[h] = np;          /* we're the new head */
```

This is `O(1)` insertion. Lookup walks the chain (`p = p->next`), which is `O(chain_length)`. With a decent hash function and a load factor below 1, chains stay short.

## Hash function quality

`hash * 31 + c` (the "Java string hash") is simple and gives reasonable distribution for English text. Better choices exist (FNV, Murmur, SipHash for security), but for non-adversarial inputs this is fine.

For HASHSIZE, a **prime** number reduces clustering — composites can leave whole buckets empty if input keys share a factor. 101 is prime; 100 would be a poor choice.

## When the chain gets long

Performance degrades when chains average > ~3-4. Two common remedies:

1. **Resize**: when load factor exceeds threshold, allocate a bigger table and rehash everything. This is what `unordered_map`/`HashMap` do under the hood.
2. **Better hash**: a hash that's poorly distributed creates artificial collisions. Try harder hashes.

K&R's plain chaining table doesn't resize — it's a teaching implementation.

## Try it

1. Add a `delete(name)` that unlinks the matching entry and frees its memory.
2. Add a counter that tracks the longest chain length. How does it grow as you `install` more keys?
3. Replace the hash with a multiplicative variant (`hash * 2654435761u`) and compare distributions.

## Notes from the author

- Chaining vs. open addressing is the classic hash-table design split. Chaining (this code) is simpler; open addressing (linear/quadratic probing, Robin Hood) is faster on modern caches because everything fits in one array.
- `strdup` allocates a new copy of the string. Always check for NULL return on the malloc family — the example skips it for brevity, but production code shouldn't.
- "Hash table from scratch" is a foundational exercise. Once you understand chaining + the dynamic-resize trick, you've built every "Map" type in every language.

*Click **next →** for `typedef`.*
