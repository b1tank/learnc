---
id: 03-08-goto-and-labels
chapter: 3
label: "3.8"
title: Goto and Labels
prev: 03-07-break-and-continue
next: ex-3-1
status: done
---

C has `goto` and named labels:

```c
goto target;
...
target:
    statement
```

Labels are local to the function; you can only `goto` within the same function. Forward and backward jumps are both allowed.

For nearly every flow control task, *some* combination of `if`, `for`, `while`, `break`, `continue`, and `return` is better. `goto` is the **escape hatch** when those tools fall short.

## The one defensible use case

Breaking out of nested loops:

```c:starter
#include <stdio.h>

int main(void) {
    int matrix[3][3] = {
        { 1, 2, 3 },
        { 4, 0, 6 },     /* target is the zero */
        { 7, 8, 9 },
    };
    int found_i = -1, found_j = -1;

    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            if (matrix[i][j] == 0) {
                found_i = i;
                found_j = j;
                goto done;     /* exit both loops at once */
            }
        }
    }
    done:
    if (found_i >= 0)
        printf("zero at [%d][%d]\n", found_i, found_j);
    else
        printf("no zero\n");
    return 0;
}
```

```output
zero at [1][1]
```

The alternatives — a flag tested in the outer loop, or extracting the search into a function with a `return` — work but each has costs (extra variable, extra indirection). For a *local* multi-loop break, `goto done;` is the cleanest expression of intent.

## The second defensible use case — error cleanup

In C, every resource (file handle, malloc'd buffer, lock) has to be released manually. A function that acquires three resources and needs to clean up after the third one fails looks like this:

```c
int do_work(void) {
    FILE *fp = fopen("input", "r");
    if (!fp) return -1;

    char *buf = malloc(1024);
    if (!buf) { fclose(fp); return -2; }

    int *table = malloc(100 * sizeof(int));
    if (!table) { free(buf); fclose(fp); return -3; }

    /* ... do work ... */

    free(table);
    free(buf);
    fclose(fp);
    return 0;
}
```

That repeated cleanup is fragile — easy to forget one call when you add a fourth resource. The `goto cleanup` pattern flattens it:

```c
int do_work(void) {
    int     rc    = -1;
    FILE   *fp    = NULL;
    char   *buf   = NULL;
    int    *table = NULL;

    fp    = fopen("input", "r"); if (!fp)    goto out;
    buf   = malloc(1024);         if (!buf)   goto out;
    table = malloc(400);          if (!table) goto out;

    /* ... do work, set rc = 0 ... */

  out:
    free(table);
    free(buf);
    if (fp) fclose(fp);
    return rc;
}
```

One cleanup path; adding a new resource means initialising it to NULL, allocating, and adding a `free` to the cleanup block. The Linux kernel uses this pattern *extensively*.

## What `goto` cannot do

- Jump into the middle of a block from outside (compilers may allow it, but variables inside that block won't be initialised — undefined behaviour).
- Cross function boundaries (use `setjmp`/`longjmp` for that, sparingly).
- Jump over a variable's declaration into its scope.

## Modern note

C23 adds `defer`-style cleanup proposals but none have landed yet. Until then the `goto cleanup` idiom is the cleanest way to write multi-resource functions. The "spaghetti goto" warning from Dijkstra was about *arbitrary* unstructured jumps, not the disciplined single-target cleanup we're using here.

## Notes from the author

- The Linux kernel coding style says "use `goto` for error handling" and is right. The cleanup-at-the-bottom pattern is sound. Banning `goto` entirely makes resource-tight code worse, not better.
- Forward-only, single-target `goto` (jumping forward to a cleanup label) is fine. Backward `goto` to simulate a loop is what causes spaghetti — and that's exactly what `while`/`for` are for.
- Modern C tooling (Clang's analyser, Coverity, etc.) understands the `goto cleanup` idiom and tracks resource state across it. You don't lose static analysis by using it.

🎉 **You've finished Chapter 3's section walkthroughs.** Up next: six exercises that put the new control flow constructs through real workouts.

*Click **next →** to start the Chapter 3 exercises.*
