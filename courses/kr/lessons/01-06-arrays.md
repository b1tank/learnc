---
id: 01-06-arrays
chapter: 1
label: "1.6"
title: Arrays
prev: ex-1-12
next: ex-1-13
status: done
---

An array is the simplest aggregate in C: a fixed-size, contiguous run of identical elements laid out back-to-back in memory. `int ndigit[10]` reserves `10 * sizeof(int)` bytes (usually 40) as one block, typically on the [stack](https://en.wikipedia.org/wiki/Stack-based_memory_allocation). There is no length stored alongside it and no bounds checking - the array *is* its bytes, and `ndigit[i]` is just arithmetic on the base address.

## Indexing is pointer arithmetic

`v[i]` is defined by the language to mean `*(v + i)`: take the array's base address, add `i` elements (the compiler scales by `sizeof(element)` automatically), and dereference. That's why indices start at **0** - the first element sits at offset zero from the base. The block below proves the equivalence and shows the 4-byte stride of an `int` array:

```c:run an array is contiguous memory
#include <stdio.h>

int main(void) {
    int v[4] = {10, 20, 30, 40};
    for (int i = 0; i < 4; i++)
        printf("v[%d]: offset %ld bytes, v[i]=%d, *(v+i)=%d\n",
               i, (char *)&v[i] - (char *)v, v[i], *(v + i));
    return 0;
}
```

```output
v[0]: offset 0 bytes, v[i]=10, *(v+i)=10
v[1]: offset 4 bytes, v[i]=20, *(v+i)=20
v[2]: offset 8 bytes, v[i]=30, *(v+i)=30
v[3]: offset 12 bytes, v[i]=40, *(v+i)=40
```

Because indexing is raw arithmetic, `v[10]` on a 4-element array happily computes an address past the block and reads or writes whatever lives there - a classic [buffer overflow](https://en.wikipedia.org/wiki/Buffer_overflow). C trades safety for speed; *you* are the bounds checker.

## Arrays as counters: histogram of digits

K&R's digit counter uses an array as a set of 10 tally slots indexed directly by the data. The trick `*p - '0'` converts a digit character to its numeric value: ASCII digits are contiguous, so `'7' - '0' == 7`. Each digit found bumps its own bucket - an O(n) single pass with O(1) lookup, the essence of a [histogram](https://en.wikipedia.org/wiki/Histogram) and of bucket/counting sort:

```c:run digit histogram
#include <stdio.h>

int main(void) {
    int ndigit[10];
    for (int i = 0; i < 10; i++)
        ndigit[i] = 0;                  /* arrays are NOT auto-zeroed on the stack */

    char *s = "phone 867-5309, pi 3.14159";
    for (char *p = s; *p; p++)
        if (*p >= '0' && *p <= '9')
            ++ndigit[*p - '0'];         /* the char value picks the bucket */

    for (int i = 0; i < 10; i++)
        printf("%d:%d ", i, ndigit[i]);
    printf("\n");
    return 0;
}
```

```output
0:1 1:2 2:0 3:2 4:1 5:2 6:1 7:1 8:1 9:2 
```

Note the explicit zeroing loop - a stack array starts with whatever garbage was already in those bytes. (A global or `static` array, living in the [`.bss` segment](https://en.wikipedia.org/wiki/.bss), *is* zero-initialized by the loader.)

## Go deeper
- [Array (C)](https://en.cppreference.com/w/c/language/array) - declaration, decay, and lifetime rules
- [Array-to-pointer decay](https://en.cppreference.com/w/c/language/array#Array_to_pointer_conversion) - why `v` becomes `&v[0]`
- [Buffer overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow) - the security cost of no bounds checks
- [Data segment / `.bss`](https://en.wikipedia.org/wiki/Data_segment) - where zero-initialized globals live
