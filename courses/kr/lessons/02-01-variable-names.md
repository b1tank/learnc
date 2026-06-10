---
id: 02-01-variable-names
chapter: 2
label: "2.1"
title: Variable Names
prev: ex-1-24
next: 02-02-data-types-and-sizes
status: done
---

A variable name is just a human-readable label the compiler maps to a storage location - a stack slot, a register, or an address in the `.data`/`.bss` segment. The name exists only at compile time; by the time the program runs, it's all addresses and offsets. C's rules: names are made of letters, digits, and underscore; they may not start with a digit; and they are **case-sensitive**. Keywords like `int`, `if`, `return` are reserved.

## Case matters, and style is a convention

`x` and `X` are two entirely different variables. C imposes no naming style - `snake_case`, `camelCase`, and `ALLCAPS` are all legal - but conventions carry meaning to humans: lowercase for variables, `ALL_CAPS` for macros/constants:

```c:run names are distinct labels
#include <stdio.h>

int main(void) {
    int x = 1;
    int X = 99;                              /* different variable: case-sensitive */
    int count_items = 5, countItems = 7;     /* snake vs camel: also distinct */
    printf("x=%d X=%d\n", x, X);
    printf("count_items=%d countItems=%d\n", count_items, countItems);
    return 0;
}
```

```output
x=1 X=99
count_items=5 countItems=7
```

## The "31 significant characters" footnote

K&R warns that only the first few characters of a name might be significant. Modern compilers track full names for internal (local) identifiers, but the C standard still only *guarantees* 31 significant characters for external names and 63 for internal ones - a limit rooted in old linkers that truncated symbols. In practice you'll never hit it, but it's why historical C libraries used terse names. Pick names that are descriptive but not novel-length: `npending`, not `numberOfCurrentlyPendingRequestsInQueue`.

## Go deeper
- [Identifiers (C)](https://en.cppreference.com/w/c/language/identifier) - the exact lexical rules and significance limits
- [C keywords](https://en.cppreference.com/w/c/keyword) - the reserved words you can't reuse
- [Naming conventions](https://en.wikipedia.org/wiki/Naming_convention_(programming)) - snake_case, camelCase, and why teams pick one
