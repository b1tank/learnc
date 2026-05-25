---
id: 02-10-assignment-operators-and-expressions
chapter: 2
label: "2.10"
title: Assignment Operators and Expressions
prev: ex-2-9
next: 02-11-conditional-expressions
status: done
---

`=` is the basic assignment. For every binary arithmetic or bitwise operator, C also provides a **compound** form:

`+=`  `-=`  `*=`  `/=`  `%=`  `<<=`  `>>=`  `&=`  `^=`  `|=`

```c
x += 3;     /* same as x = x + 3 */
y *= 2;     /* same as y = y * 2 */
flags |= MASK;
n &= ~MASK;
```

## Why they matter beyond brevity

- They evaluate the left-hand expression **once**. With `arr[expensive_index()] += 1`, the index is computed only one time. The plain rewrite `arr[expensive_index()] = arr[expensive_index()] + 1` would compute it twice.
- They communicate intent: `total += x` reads as "accumulate x into total."
- For multi-byte left sides (struct fields, indexed array elements), they're often the only ergonomic form.

## Assignment is an expression

C's assignment **returns the value being stored**. So `x = y = z = 0` parses right-to-left: `z = 0` returns `0`, then `y = 0`, then `x = 0`. All three get zero.

This is why the read-loop idiom works:

```c
int c;
while ((c = getchar()) != EOF) { ... }
```

`c = getchar()` is itself an expression with the value `getchar()` returned. The surrounding `!= EOF` then tests that value. Without assignment-as-expression you'd need to read twice or use an extra variable.

```c:starter
#include <stdio.h>

int main(void) {
    int total = 0;
    for (int i = 1; i <= 10; ++i)
        total += i;
    printf("sum 1..10 = %d\n", total);

    /* multi-assign chain */
    int a, b, c;
    a = b = c = 7;
    printf("a=%d b=%d c=%d\n", a, b, c);

    /* assignment as expression in a condition */
    int n;
    /* On real input this reads until EOF; for the embedded demo we
       just initialise and stop. */
    n = 42;
    if ((n = n + 1) > 0)
        printf("after increment, n = %d\n", n);

    return 0;
}
```

```output
sum 1..10 = 55
a=7 b=7 c=7
after increment, n = 43
```

## Don't accidentally test an assignment

The classic typo:

```c
if (x = 0) ...   /* assigns 0, then tests 0; branch never taken */
if (x == 0) ...  /* equality test */
```

Modern compilers warn at `-Wall`. The "Yoda comparison" style — `if (0 == x)` — protects against the typo because `0 = x` won't compile. Some teams require it; most prefer to lean on `-Werror`.

## Modern note

Compound operators interact well with explicitly-sized types: `uint32_t value; value |= flag_bit;` keeps the result in the same width. Use them throughout numeric code — they're not just syntactic sugar.

## Try it

1. Rewrite the §1.5 character counter with `++nc` replaced by `nc += 1`. Identical machine code, slightly different reading rhythm.
2. Use `total *= 2;` inside a loop to double a value 10 times. Watch it overflow `int` (around iteration 31 from `1`).
3. Chain assignments: `a = b = c = readNumber();`. The function is called once; all three variables share the value.

## Notes from the author

- The "evaluates the LHS once" property is the **most underrated** reason to prefer compound forms. Once you've debugged a `arr[get_idx()] = arr[get_idx()] + 1` bug where the index function had side effects, you never write it the long way again.
- "Assignment is an expression" is a C-family characteristic. Some newer languages (Python, Rust, Swift) deliberately make assignment a statement to prevent the `if (x = 0)` bug. C's tradeoff: more expressive, requires more care.
- The chained `a = b = c = 0` works because of right-to-left associativity. Don't confuse it with **comma expressions** `a = 0, b = 0, c = 0`, which use the comma operator and have left-to-right evaluation.

*Click **next →** to write conditional expressions with `?:`.*
