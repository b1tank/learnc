---
id: 01-04-symbolic-constants
chapter: 1
label: "1.4"
title: Symbolic Constants
prev: ex-1-5
next: 01-05-character-input-and-output
status: done
---

Magic numbers buried in code are a maintenance trap. C's oldest fix is `#define`, a [preprocessor](https://en.wikipedia.org/wiki/C_preprocessor) directive. The crucial mental model: the preprocessor runs *before* the compiler and does pure **text substitution**. By the time the compiler sees your code, every `LOWER` has already been replaced by `0` - the name doesn't exist in the compiled program at all.

```c:run named constants in the table
#include <stdio.h>

#define LOWER 0      /* lower limit of table */
#define UPPER 300    /* upper limit          */
#define STEP  20     /* step size            */

int main(void) {
    for (int fahr = LOWER; fahr <= UPPER; fahr += STEP)
        printf("%3d %6.1f\n", fahr, (5.0 / 9.0) * (fahr - 32));
    return 0;
}
```

```output
  0  -17.8
 20   -6.7
 40    4.4
 60   15.6
 80   26.7
100   37.8
120   48.9
140   60.0
160   71.1
180   82.2
200   93.3
220  104.4
240  115.6
260  126.7
280  137.8
300  148.9
```

Note: no semicolon, no type. `#define UPPER 300` is a textual rule, not a statement. The substituted text runs to the end of the line.

## Text substitution is literal - and dangerous

Because the preprocessor doesn't understand C, function-like macros expand their arguments verbatim, with no regard for operator precedence. The textbook trap:

```c:run macro substitution pitfall
#include <stdio.h>

#define BAD(x)  x*x         /* expands to:  1+2*1+2  = 5  */
#define GOOD(x) ((x)*(x))   /* expands to: ((1+2)*(1+2)) = 9 */

int main(void) {
    printf("BAD(1+2)  = %d\n", BAD(1+2));
    printf("GOOD(1+2) = %d\n", GOOD(1+2));
    return 0;
}
```

```output
BAD(1+2)  = 5
GOOD(1+2) = 9
```

`BAD(1+2)` becomes the text `1+2*1+2`, which by precedence is `1 + (2*1) + 2 = 5`. Always parenthesize macro parameters *and* the whole body. Macros also evaluate arguments more than once - `GOOD(i++)` would increment `i` twice.

## Three ways to name a constant

| Tool | Has a type? | Scoped? | Visible to debugger? | Use for |
|------|-------------|---------|----------------------|---------|
| `#define N 300` | no | no (whole file from that line) | no (gone after preprocessing) | conditional compilation, sizes |
| `const int n = 300;` | yes (`int`) | yes (block/file) | yes | typed constants you may take the address of |
| `enum { N = 300 };` | yes (int constant) | yes | yes | sets of related integer constants |

For a single integer the modern instinct is `const` or `enum` - they're typed and respect scope. `#define` still wins where you need a value *before* the compiler proper runs (array sizes in older C, `#if` conditionals).

```c:run const and enum
#include <stdio.h>

const double FAHR_OFFSET = 32.0;
enum { ROWS = 3 };

int main(void) {
    for (int i = 0; i < ROWS; i++)
        printf("row %d, offset %.0f\n", i, FAHR_OFFSET);
    return 0;
}
```

```output
row 0, offset 32
row 1, offset 32
row 2, offset 32
```

You can watch the substitution yourself: `cc -E file.c` stops after the preprocessor and prints the expanded source.

## Go deeper
- [C preprocessor](https://en.wikipedia.org/wiki/C_preprocessor) - directives, macros, conditional compilation
- [`#define` reference](https://en.cppreference.com/w/c/preprocessor/replace) - object-like vs function-like macros
- [`const` qualifier](https://en.cppreference.com/w/c/language/const) - typed read-only objects
