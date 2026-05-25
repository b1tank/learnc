---
id: 01-04-symbolic-constants
chapter: 1
label: "1.4"
title: Symbolic Constants
prev: ex-1-5
next: 01-05-character-input-and-output
status: done
---

The temperature loop has three numbers — `0`, `300`, `20` — sitting bare inside the `for` header. Anyone reading the code six months from now has to *infer* what they mean. Worse, if the lower bound has to change, you have to find every occurrence. C's answer is `#define`: give the constant a name, and the name *is* the documentation.

```c:starter
#include <stdio.h>

#define LOWER  0     /* lower limit of table */
#define UPPER  300   /* upper limit */
#define STEP   20    /* step size */

int main(void) {
    printf("Fahr  Celsius\n");
    for (int fahr = LOWER; fahr <= UPPER; fahr += STEP)
        printf("%4d  %6.1f\n", fahr, (5.0/9.0) * (fahr - 32));
    return 0;
}
```

```output
Fahr  Celsius
   0   -17.8
  20    -6.7
  40     4.4
  60    15.6
  80    26.7
 100    37.8
 120    48.9
 140    60.0
 160    71.1
 180    82.2
 200    93.3
 220   104.4
 240   115.6
 260   126.7
 280   137.8
 300   148.9
```

## What's going on

- **`#define NAME replacement`** is a *preprocessor directive*. Before the compiler proper ever sees the file, the preprocessor walks through and does a textual substitution: every standalone occurrence of `NAME` outside a string literal is replaced by the literal characters of `replacement`. Run `cc -E file.c` to see exactly what the compiler ends up reading — it's eye-opening.
- **No semicolon at the end of a `#define`**. The directive ends at the newline. If you write `#define UPPER 300;`, the trailing semicolon becomes *part of the replacement*, so `fahr <= UPPER` expands to `fahr <= 300;` — a syntax error in a header line you didn't suspect. This bites everyone exactly once.
- **Conventionally all-uppercase.** A name like `STEP` shouts "I am not a variable — I am a textual macro." Lowercase macros are legal but ambiguous; uppercase is the universal hint.
- **Not a variable.** `LOWER` has no address, no type, no storage. You can't take `&LOWER`. You can't assign to it. After preprocessing, it is *gone* — the compiler only sees the literal `0`.
- **The replacement text can be any sequence of characters.** `#define PI 3.14159`, `#define MAX(a,b) ((a)>(b)?(a):(b))`, `#define FOREVER for(;;)`. Function-like macros (the ones with parentheses after the name) come later; for now, single-token replacements cover 99 % of what you need.
- **`fahr += STEP`** is the same as `fahr = fahr + STEP`. C inherited this compound-assignment family (`+= -= *= /= %= &= |= ^= <<= >>=`) from B. They aren't just shorter — they evaluate the left side once, which matters when it's an expression with side effects.

## Modern note

`#define` is *not* the only way to name a constant in modern C — and most of the time it's no longer the best way.

- `const int LOWER = 0;` is a real variable with a type. The compiler can warn you if you use it wrong (e.g. comparing `int` to `unsigned`). It has an address. You can step into it in a debugger.
- `enum { LOWER = 0, UPPER = 300, STEP = 20 };` gives you a typed integer constant *without* the preprocessor and works inside `switch` case labels.

So when do you still reach for `#define`? When you need a *literal* that gets pasted into source — e.g. a string fragment, a format specifier, an array size that has to be a compile-time constant in older C dialects, or a conditionally compiled block (`#ifdef DEBUG`). For plain numeric scalars in new code, prefer `const` or `enum`.

The preprocessor is the dustier corner of C: powerful, dangerous, syntactically separate from the rest of the language. Read it like a different tool inside the same toolbox.

## Try it

1. Re-run the program. The output should be identical to the §1.3 version — that's the whole point of `#define`: it doesn't change behaviour, only readability.
2. Change `STEP` to `10`. Notice you edited *one line*, not five. Run it.
3. Add `;` to the end of one `#define` line. Read the compiler error carefully and find where the rogue semicolon ended up.
4. Replace one of the `#define`s with `const int LOWER = 0;` (and move the line inside `main`). Does it still compile? Try moving it back outside `main` — what changes?
5. Replace all three `#define`s with a single `enum { LOWER = 0, UPPER = 300, STEP = 20 };` at file scope. Compile and run.
6. Mind-bender: add `#define UPPER 1000` *after* the original `#define UPPER 300`. What does the compiler say? Most compilers warn, but the second `#define` wins. Why is that surprising at first?

## Notes from the author

- The headline you want to leave the reader with: **`#define` is a search-and-replace pass that happens before compilation, not a language construct.** Once that mental model clicks, every macro pitfall (operator-precedence inside macros, multiple evaluation of macro arguments, line-number confusion in error messages) becomes obvious.
- I leaned on the "modern note" to push `const`/`enum` over `#define`. K&R wrote when neither was available; today many style guides (Linux kernel, MISRA-C automotive, Google C++) actively discourage non-functional `#define`s. Worth turning into a fuller section once you find your own footing.
- Experiment #6 (redefinition warning) is a great segue to `#ifdef`/`#undef`. I held off because §4.11 covers the preprocessor properly. When you revise, decide whether to preview it here or stay focused.
- The build pipeline diagram (`source → preprocessor → compiler → assembler → linker`) would land beautifully right after the "Not a variable" bullet. I left it out because the lesson is already dense; if you have a place for an illustration, this is it.

*Click **next →** to leave temperature behind forever and start reading characters from the keyboard.*
