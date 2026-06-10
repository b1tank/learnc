---
id: 03-08-goto-and-labels
chapter: 3
label: "3.8"
title: Goto and Labels
prev: 03-07-break-and-continue
next: 04-01-basics-of-functions
status: done
---

`goto label;` transfers control unconditionally to a `label:` elsewhere in the *same function*. It's the raw branch instruction all other control flow is built from - and the one the structured-programming movement spent decades teaching us to avoid, because unrestricted jumps create "spaghetti" code that's impossible to reason about. C keeps `goto` for the handful of cases where structured constructs are genuinely clumsier, but the default answer is: don't.

## The legitimate use: escaping nested loops

```c:run goto to break out of nested loops
#include <stdio.h>

int main(void) {
    int a[3][3] = {{1,2,3},{4,0,6},{7,8,9}};
    int found = 0;

    for (int i = 0; i < 3; i++)
        for (int j = 0; j < 3; j++)
            if (a[i][j] == 0) {       /* found it - abandon BOTH loops at once */
                found = 1;
                goto done;
            }
done:
    if (found) printf("zero found, search aborted\n");
    else       printf("no zero\n");
    return 0;
}
```

```output
zero found, search aborted
```

Because `break` only escapes *one* loop level, jumping to a label just past a nest of loops is the cleanest way to bail out completely. The label can only be reached deliberately, control flows strictly forward, and the exit point is obvious - none of the dangers that make `goto` notorious. The same pattern powers C's standard **error-cleanup idiom**: on failure, `goto cleanup;` where `cleanup:` frees buffers, closes files, and returns - letting many error paths share one teardown block instead of duplicating it.

## The rules and the discipline

A label is function-scoped, so `goto` cannot jump into another function, into the middle of a block past a variable's initialization, or backward in ways that skip declarations. Restrict yourself to **forward** jumps to a single nearby exit/cleanup label and `goto` stays tame. The historical objection (Dijkstra's "Go To Statement Considered Harmful") is about jumping *backward* and *every which way* to build loops by hand - which is why you should use `for`/`while`/`break`/`continue` for ordinary control flow and reserve `goto` for the two patterns above: nested-loop exit and centralized cleanup.

## Go deeper
- [`goto` statement (C)](https://en.cppreference.com/w/c/language/goto) - scope and restrictions
- [Go To Statement Considered Harmful](https://en.wikipedia.org/wiki/Considered_harmful) - Dijkstra's famous critique
- [Error handling with goto in the Linux kernel](https://www.kernel.org/doc/html/latest/process/coding-style.html#centralized-exiting-of-functions) - the cleanup idiom in real code
- [Spaghetti code](https://en.wikipedia.org/wiki/Spaghetti_code) - what unrestricted `goto` produces
