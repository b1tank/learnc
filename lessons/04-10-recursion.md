---
id: 04-10-recursion
chapter: 4
label: "4.10"
title: Recursion
prev: 04-09-initialization
next: 04-11-the-c-preprocessor
status: done
---

A function that calls itself is *recursive*. C allows it without ceremony — every function in C may call itself or any other function.

## A recursive `itoa`

In §3.6 we used a `do`/`while` loop and `reverse(s)` to print integer digits in the right order. Recursion eliminates the reverse step: emit the high-order digits first by recursing before printing.

```c:starter
#include <stdio.h>

void print_digits(int n);

int main(void) {
    print_digits(0);     printf("\n");
    print_digits(7);     printf("\n");
    print_digits(12345); printf("\n");
    print_digits(-42);   printf("\n");
    return 0;
}

void print_digits(int n) {
    if (n < 0) {
        putchar('-');
        n = -n;          /* leaves INT_MIN as a known bug; see §3-4 */
    }
    if (n / 10 != 0)
        print_digits(n / 10);   /* recurse first */
    putchar(n % 10 + '0');      /* then print our digit */
}
```

```output
0
7
12345
-42
```

Each call handles **one digit**: the most significant decimal digit on the way *down* the call stack, the rest emitted by deeper calls. As the recursion unwinds, the digits come out left-to-right.

## When recursion shines

- **Tree-shaped data**: parsers, file system walkers, AST evaluators, expression evaluators.
- **Divide-and-conquer**: quicksort, mergesort, binary search.
- **Naturally recursive math**: factorial, Fibonacci, Ackermann, GCD.

In each case, the recursive structure mirrors the data or algorithm structure, and the code reads close to the math.

## The cost of recursion

Each call consumes a stack frame: space for parameters, return address, and locals. The OS gives you a fixed-size stack (typically 1–8 MB). Recursing 100,000 levels deep will overflow it and your program crashes.

Two strategies:

1. **Bound the depth.** For balanced trees and divide-and-conquer, depth is `O(log n)` — safe even for huge inputs.
2. **Tail recursion / convert to iteration.** If the recursive call is the *last* thing the function does, the compiler can sometimes replace it with a jump, reusing the same stack frame ("tail-call optimisation"). GCC/Clang do this with `-O2` for plain recursive tail calls. Not guaranteed by the standard, so for production code where stack depth is unbounded, convert to a `while` loop explicitly.

## Quicksort sketch

```c
void quicksort(int v[], int lo, int hi) {
    if (lo >= hi) return;
    int pivot = v[lo + (hi - lo) / 2];
    int i = lo, j = hi;
    while (i <= j) {
        while (v[i] < pivot) ++i;
        while (v[j] > pivot) --j;
        if (i <= j) {
            int tmp = v[i]; v[i] = v[j]; v[j] = tmp;
            ++i; --j;
        }
    }
    quicksort(v, lo, j);
    quicksort(v, i, hi);
}
```

Two recursive calls each shrink the work by half (on average). Depth is `O(log n)` for random inputs but `O(n)` for already-sorted inputs (worst case) — a classic gotcha that motivates "randomised pivot" or median-of-three pivot selection.

## Modern note

- **Stack overflow is undetectable** in pure standard C. Linux/macOS will SEGV, Windows will crash differently. Tools like AddressSanitizer can detect it; for production code with unknown input sizes, prefer iteration or hand-rolled stack allocation.
- **Indirect recursion** — `f` calls `g` calls `f` — also counts. The compiler can analyse it but can't eliminate it as cleanly as direct tail calls.
- For complex recursive algorithms, instrumenting `printf("depth=%d\n", depth)` at the top is the simplest debugging trick. Most real recursion bugs are "I forgot a base case" or "I'm not making progress".

## Try it

1. Write a recursive `int factorial(int n)`. Test it for `n=10`, `n=20`. Notice it overflows `int` around `n=12`; use `long long` (or `uint64_t`) for larger ranges.
2. Implement `int gcd(int a, int b)` using Euclid's algorithm: `gcd(a, b) = gcd(b, a%b)`, with `gcd(a, 0) = a`. Two lines, one recursive call.
3. Convert `print_digits` to iteration without using a reverse step. Hint: compute the highest power of 10 ≤ n first, then peel digits from the high end. Compare readability — the recursive version is shorter and clearer.

## Notes from the author

- The "recurse first, print after" pattern in `print_digits` is the classical example of using recursion to *reverse* the order of operations without an explicit data structure. The call stack IS the reverse-storage.
- Tail recursion is a beautiful concept that the C standard doesn't quite specify. GCC and Clang try hard but it's not portable. For real "infinite-depth-safe" recursive code, write iteratively.
- Many recursive functions (especially Fibonacci) have exponential time complexity due to recomputation. Memoisation or dynamic programming fixes it but is a separate topic. The recursion *itself* isn't slow; the *redundant work* is.

*Click **next →** for the C preprocessor — the final piece of Chapter 4.*
