---
id: 03-07-break-and-continue
chapter: 3
label: "3.7"
title: Break and Continue
prev: ex-3-6
next: 03-08-goto-and-labels
status: done
---

Two keywords that change the normal "test condition, run body, repeat" flow:

- **`break`** — exit the innermost enclosing `for`, `while`, `do`/`while`, or `switch`.
- **`continue`** — skip the rest of the body and jump to the loop's update/condition step. Inside a `for`, the update runs; inside a `while`, the condition runs.

`break` never crosses more than one loop level. To exit two nested loops at once, you need a flag, a `goto` (next lesson), or a refactor into a function with a `return`.

```c:starter
#include <stdio.h>

int main(void) {
    /* find the first negative element */
    int v[] = { 3, 7, 2, -1, 5, -3, 8 };
    int n = 7, first_neg = -1;

    for (int i = 0; i < n; ++i) {
        if (v[i] < 0) {
            first_neg = i;
            break;       /* found it, no need to keep looking */
        }
    }
    printf("first negative at index %d\n", first_neg);

    /* sum only the positives, skip negatives */
    int total = 0;
    for (int i = 0; i < n; ++i) {
        if (v[i] < 0)
            continue;    /* skip this iteration, go to ++i */
        total += v[i];
    }
    printf("sum of positives = %d\n", total);

    return 0;
}
```

```output
first negative at index 3
sum of positives = 25
```

## `continue` and `for` updates

The subtle thing is: inside a `for`, `continue` jumps to the update slot, not the condition. So this loop terminates:

```c
for (int i = 0; i < 10; ++i) {
    if (i % 2) continue;
    printf("%d ", i);   /* prints even numbers */
}
```

But the same pattern inside a `while` does NOT auto-increment:

```c
int i = 0;
while (i < 10) {
    if (i % 2) continue;      /* infinite loop! i never increments */
    printf("%d ", i);
    ++i;
}
```

If you `continue` inside a `while`, make sure the update has already happened above the `continue`.

## `break` in `switch`

We already saw this in §3.4: `break` is what stops a `switch` case from falling through to the next. So inside a `switch` inside a loop, a plain `break` exits the **`switch`**, not the loop:

```c
for (i = 0; i < n; ++i) {
    switch (v[i]) {
        case 0:
            break;        /* exits the switch, NOT the for */
    }
}
```

To exit the loop from inside a `switch`, you need a flag, a labelled `break` (not in C), or a `goto`.

## Modern note

Excessive `break`s and `continue`s in a loop signal that the loop is doing too much. If a `for` body has three different `break`s and two `continue`s, refactor: extract a helper function and use `return`, or restructure the condition.

For "search loops" — find first element matching X — a `for` + `break` is actually cleaner than the alternatives. Don't over-restructure on principle.

## Try it

1. Find the first character in a string that isn't a digit. `for (i=0; s[i]; ++i) if (!isdigit(s[i])) break;` then `i` is the index.
2. Skip blank lines in input: `for (;;) { read_line(); if (line_is_blank()) continue; process(); }`. Notice `continue` jumps to the top of the infinite loop.
3. Try a `break` inside `switch` inside `for`. Convince yourself it exits the `switch` only.

## Notes from the author

- The `continue` skipping the body but running the update is a `for`-specific gotcha. Always-`for` style avoids the `while` foot-gun (the increment must be above the `continue`).
- "Break out of two loops" is the original sin that gives `goto` its remaining defensible use case (next lesson). Or extract a function and `return`. Or set a flag. Pick whichever reads cleanest in your context.
- Many style guides limit `break`/`continue` use to "early-exit search" patterns. Inside a tight loop with intricate flow, every `continue` is a place future readers must remember to skip past. Keep it simple.

*Click **next →** for `goto` and labels (yes, really).*
