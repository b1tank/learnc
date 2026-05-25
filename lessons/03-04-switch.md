---
id: 03-04-switch
chapter: 3
label: "3.4"
title: Switch
prev: ex-3-1
next: ex-3-2
status: done
---

`switch` is a multiway branch over a single integer expression compared against integer constants. The general form:

```c
switch (expression) {
    case constant1:
        statements
        break;
    case constant2:
        statements
        break;
    default:
        statements
}
```

The expression is evaluated once, and control jumps to the matching `case` label. The `default` is optional — if no case matches and there's no `default`, the entire `switch` is skipped.

## The fall-through trap

C's `switch` does **not** stop at the next `case` automatically. Without an explicit `break`, control falls through into the next case:

```c
switch (n) {
    case 1: printf("one ");
    case 2: printf("two ");
    case 3: printf("three "); break;
    default: printf("other ");
}
```

For `n == 1` this prints `one two three ` because there are no `break`s between cases 1 and 3. This is occasionally what you want (multiple labels sharing one body) but more often it's a bug. **Every case should normally end with `break` or `return`.**

```c:starter
#include <stdio.h>

void count_char(int c, int *digits, int *whitespace, int *other);

int main(void) {
    int d = 0, w = 0, o = 0;
    char *s = "Hello 123 World\n";
    for (int i = 0; s[i] != '\0'; ++i)
        count_char(s[i], &d, &w, &o);
    printf("digits=%d  whitespace=%d  other=%d\n", d, w, o);
    return 0;
}

void count_char(int c, int *digits, int *whitespace, int *other) {
    switch (c) {
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            (*digits)++;
            break;
        case ' ': case '\t': case '\n':
            (*whitespace)++;
            break;
        default:
            (*other)++;
            break;
    }
}
```

```output
digits=3  whitespace=4  other=10
```

Multiple `case` labels stacked above one body is the **intentional** fall-through pattern.

## What `switch` is good at

- **Discrete integer values** — character classification, enum dispatch, opcode interpretation.
- **Compiler-generated jump tables** — for dense case ranges, modern compilers emit a single indirect jump (O(1) regardless of case count).

## What `switch` cannot do

- Test ranges (`case 1..10:` is not standard C — GCC has it as an extension).
- Switch on strings, floats, or arbitrary expressions.
- Capture the matching value into a variable (no Rust-style `match`).

For string dispatch, build an `if`-chain with `strcmp`, or hash strings to integers.

## Modern note

For intentional fall-through, GCC/Clang understand the `__attribute__((fallthrough))` annotation (and C23 standardises `[[fallthrough]];`). It signals "the missing break is on purpose" to both compiler warnings and human readers:

```c
case 'a':
    do_a();
    [[fallthrough]];   /* C23, or: __attribute__((fallthrough)) before */
case 'b':
    do_b();
    break;
```

Always-`break` style is even simpler: never let fall-through happen unless multiple labels share *exactly* one body.

## Notes from the author

- The fall-through behaviour is the canonical "C surprise". Modern languages (Rust, Go, Swift) all switched to "no fall-through by default" and require explicit opt-in. C kept it for backward compatibility.
- The "stack labels, no body" pattern for character classes is the prettiest use of `switch`. Compare to an `else if` chain for the same task: the `switch` reads as a *table* of inputs, which is much closer to how the human brain processes it.
- Compilers can transform a dense `switch` into a jump table (single indirect-branch lookup). For sparse cases they fall back to binary or linear search. Either way, the `switch` is usually faster than the equivalent `if` chain.

*Click **next →** for `while` and `for` loops.*
