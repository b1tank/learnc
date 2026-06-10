---
id: 03-04-switch
chapter: 3
label: "3.4"
title: Switch
prev: ex-3-1
next: ex-3-2
status: done
---

`switch` dispatches on the value of a single integer expression, jumping straight to the matching `case` label. Unlike an `else if` ladder it doesn't test conditions one by one - the compiler can build a **jump table** (an array of addresses indexed by the value) or a balanced search, giving near-constant dispatch over many cases. The labels must be integer (or character) *constant expressions*, all distinct; `default` catches anything unmatched.

## Cases, fall-through, and `break`

```c:run switch with intentional fall-through
#include <stdio.h>

int main(void) {
    for (char c = 'a'; c <= 'e'; c++) {
        switch (c) {
            case 'a':
            case 'e':
            case 'i':
            case 'o':
            case 'u':
                printf("%c is a vowel\n", c);
                break;
            default:
                printf("%c is a consonant\n", c);
                break;
        }
    }
    return 0;
}
```

```output
a is a vowel
b is a consonant
c is a consonant
d is a consonant
e is a vowel
```

The key behavior - and C's most infamous footgun - is **fall-through**: once execution jumps to a `case`, it keeps running into the *next* case unless a `break` stops it. Here that's used deliberately: `case 'a':` through `case 'u':` stack up with no code between them, so all five vowels share one body. But forget a `break` between two cases that *do* have bodies and you'll silently run both - the bug behind countless production incidents.

## Why it exists and how it compiles

A `switch` is really "compute a value, then `goto` the right label." For dense case values (`0,1,2,3,...`) the compiler emits a jump table: index into an address array and branch - O(1), no comparisons. For sparse values it may emit a binary search or just a comparison chain. That's why `switch` on an `enum` of states is the standard shape for parsers, virtual machines, and protocol handlers.

Style discipline: always end each non-empty case with `break` (or `return`), put `default` last, and when you *intend* fall-through, mark it with a comment like `/* fall through */` so reviewers know it wasn't an accident. `switch` only compares for *equality* against constants - for ranges or non-constant tests, you still need `if`/`else if`.

## Go deeper
- [`switch` statement (C)](https://en.cppreference.com/w/c/language/switch) - labels, `default`, and fall-through
- [Switch fallthrough](https://en.wikipedia.org/wiki/Switch_statement#Fallthrough) - the behavior and its dangers
- [Branch table / jump table](https://en.wikipedia.org/wiki/Branch_table) - how `switch` reaches O(1) dispatch
- [Duff's device](https://en.wikipedia.org/wiki/Duff%27s_device) - fall-through taken to its wild extreme
