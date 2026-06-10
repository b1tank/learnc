---
id: 06-03-arrays-of-structures
chapter: 6
label: "6.3"
title: 'Arrays of Structures'
prev: 06-02-structures-and-functions
next: ex-6-1
status: done
---

Combining the two aggregates gives an **array of structures** - a table where each row is a record with named fields. This is one of the most common data shapes in real C programs: a symbol table (name + value), a list of keywords (word + count), a set of menu items, a roster of employees. The whole array is one contiguous block, with each struct (padding included) laid end to end, so you can index rows with `[]` and reach fields with `.`.

## A table of records

```c:run an array of structs is a table of rows
#include <stdio.h>

struct entry { char *word; int count; };   /* one row: a word and its tally */

int main(void) {
    struct entry tab[] = {
        {"int",    3},
        {"return", 2},
        {"if",     5}
    };
    int n = sizeof tab / sizeof tab[0];     /* element count, computed safely */

    for (int i = 0; i < n; i++)
        printf("%-8s %d\n", tab[i].word, tab[i].count);
    return 0;
}
```

```output
int      3
return   2
if       5
```

Each element `tab[i]` is a full `struct entry`; `tab[i].word` and `tab[i].count` reach its fields. The initializer is a list of brace-enclosed rows, and leaving the size empty (`tab[]`) lets the compiler count them. The `sizeof tab / sizeof tab[0]` idiom computes the number of elements *without* hard-coding 3 - it divides the whole array's size by one element's size, so it stays correct if you add or remove rows. The `%-8s` format left-justifies each word in an 8-column field, lining up the counts.

## Layout, and why it matters for performance

In memory the table is `tab[0]` immediately followed by `tab[1]`, then `tab[2]` - each occupying `sizeof(struct entry)` bytes (including any internal padding). Because the rows are contiguous, walking the array with `tab[i]` (or a moving pointer `p = tab; p < tab + n; p++`) marches straight through memory, which is exactly the access pattern [CPU caches](https://en.wikipedia.org/wiki/CPU_cache) reward. This "array of structs" layout keeps each record's fields together, ideal when you process whole records at a time. (The alternative, "struct of arrays" - separate parallel arrays, one per field - is faster when you sweep a *single* field across all records, a trick used in high-performance and SIMD code.) One practical note from the previous section: assigning `tab[i] = tab[j]` copies the entire struct, and sorting such a table swaps whole structs unless you instead sort an array of *pointers* into it - cheaper when the structs are large.

## Go deeper
- [Arrays of structs (C)](https://en.cppreference.com/w/c/language/array) - combining the aggregates
- [`sizeof arr / sizeof arr[0]`](https://en.cppreference.com/w/c/language/sizeof) - the element-count idiom
- [AoS vs SoA](https://en.wikipedia.org/wiki/AoS_and_SoA) - layout choices and performance
- [Cache locality](https://en.wikipedia.org/wiki/Locality_of_reference) - why contiguous tables are fast
