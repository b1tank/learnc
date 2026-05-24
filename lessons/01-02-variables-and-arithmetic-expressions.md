---
id: 01-02-variables-and-arithmetic-expressions
chapter: 1
label: "1.2"
title: Variables and Arithmetic Expressions
prev: 01-01-getting-started
next: 01-03-the-for-statement
status: done
---

The second program in K&R prints a Fahrenheit-to-Celsius conversion table. It is still one function — `main` — but it now has variables, arithmetic, a loop, and formatted output. Five new ideas packed into twenty lines. Run it once, then read the breakdown — each piece will come back in every future lesson.

```c:starter
#include <stdio.h>

/* print Fahrenheit-Celsius table
   for fahr = 0, 20, ..., 300 */
int main(void) {
    int fahr, celsius;
    int lower, upper, step;

    lower = 0;       /* lower limit of temperature scale */
    upper = 300;     /* upper limit */
    step = 20;       /* step size */

    fahr = lower;
    while (fahr <= upper) {
        celsius = 5 * (fahr - 32) / 9;
        printf("%d\t%d\n", fahr, celsius);
        fahr = fahr + step;
    }
    return 0;
}
```

```output
0	-17
20	-6
40	4
60	15
80	26
100	37
120	48
140	60
160	71
180	82
200	93
220	104
240	115
260	126
280	137
300	148
```

## What's going on

- **Comments** are `/* ... */`. Everything between the markers is ignored by the compiler. Use them to explain *why*, not *what* — the code already says *what*.
- **Declarations** announce a variable's type before it is used: `int fahr, celsius;` says "I will use the names `fahr` and `celsius`, and both hold integers." In C, every variable must be declared before its first use.
- **Assignment** uses a single `=`, not `:=` or `==`. `lower = 0;` stores zero in `lower`. The statement ends in a semicolon — every C statement does.
- **`while` loop**. `while (cond) { body }` evaluates `cond`; if true, runs the body and tries again. When `cond` becomes false the loop exits. Here it advances `fahr` by `step` until `fahr` passes `upper`.
- **Integer arithmetic truncates.** `5 * (fahr - 32) / 9` is grouped left-to-right: multiply first, then divide. If you wrote `(fahr - 32) * 5 / 9` it still works. But `(fahr - 32) * (5/9)` would print zero for every row — `5/9` between two `int`s is `0`, not `0.555…`. This is the single most common surprise in early C.
- **`printf` format specifiers.** `%d` means "substitute a decimal integer here". `printf("%d\t%d\n", fahr, celsius)` prints `fahr`, a tab, `celsius`, a newline. The number and types of `%` codes must match the number and types of arguments after the format string.

## Modern note

K&R's original is `main()` with no return statement. Modern C wants `int main(void)` and a `return 0;` — both already applied above. K&R also defaults to integer arithmetic for the formula; the next page of the book rewrites the same program using `float` so the output reads `-17.8` instead of `-17`. The integer version is correct for what it computes; it just isn't physics-accurate. Try the float version yourself in the experiments below.

## Try it

1. Add a heading row above the table: `printf("Fahr\tCels\n");` before the loop.
2. The columns are ragged. Replace `"%d\t%d\n"` with `"%3d %6d\n"` to right-justify them.
3. Switch to floating-point: declare the variables as `float`, change the formula to `celsius = (5.0 / 9.0) * (fahr - 32.0);`, and the format to `"%3.0f %6.1f\n"`. The Celsius column should now show one decimal.
4. Make a Celsius-to-Fahrenheit table going from `-40` to `120` in steps of `10` (K&R exercise 1-4). The formula is `fahr = celsius * 9 / 5 + 32`.
5. Swap `<=` for `<` in the `while` condition. What disappears from the output? Why?

## Notes from the author

- The integer-arithmetic gotcha (`5/9 = 0`) is *the* canonical "C is not Python" lesson. If you came from a high-level language this is the first place the metal shows through. When you revise, consider expanding this into its own callout — it's worth more than one bullet.
- I deliberately did not show the floating-point version inline because the `while` loop is the headline; the float rewrite is in the experiments and again in 1.3. If you find that too subtle, swap experiment #3 into the main code and add a "Modern note" about IEEE-754.
- The `printf` format string is the first sighting of C's *implicit contract* between format and arguments — mismatched specifiers don't crash, they silently print garbage. Worth a deeper note when you have time; modern compilers warn under `-Wformat`, the wasm runtime here may or may not.

*Click **next →** to meet the `for` loop, which packs initialise/test/increment into one line.*

