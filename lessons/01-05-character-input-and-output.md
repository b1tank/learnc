---
id: 01-05-character-input-and-output
chapter: 1
label: "1.5"
title: Character Input and Output
prev: 01-04-symbolic-constants
next: 01-06-arrays
status: done
---

Up to now your programs have only produced output. This section teaches them to *consume* input. The model is dead simple: the standard library treats text as a one-way **stream** of characters. `getchar()` pulls the next character off the stream, `putchar()` pushes one onto the output stream. That one model — read a character, do something, repeat — is enough to build file copiers, line counters, word counters, primitive compilers, anything that processes text.

The starter program is the smallest meaningful one: copy input to output, character by character, until end-of-file. Type some text into the **stdin** pane below the editor, click run, and watch your input echo back.

```c:starter
#include <stdio.h>

/* copy stdin to stdout, one character at a time */
int main(void) {
    int c;

    while ((c = getchar()) != EOF)
        putchar(c);

    return 0;
}
```

```output
```

## What's going on

- **The stream model.** Programs see input as an unbounded sequence of bytes: keyboard typing, a redirected file, a pipe from another program. The OS hands them to you one at a time through `getchar()`. There is no rewinding (that comes in chapter 7) and no peek-ahead — once you've read a character, the next call to `getchar()` returns whatever is after it.
- **`getchar()` returns `int`, not `char`.** This is one of C's classic gotchas. To read a character you write `int c; c = getchar();` — never `char c;`. The reason is `EOF`: the sentinel value that means "the stream is exhausted." `EOF` is `-1` in every implementation you'll meet, and it has to be distinguishable from every legal byte value (0–255). A `char` can't represent both 256 distinct byte values and `EOF` — only an `int` can.
- **Assignment is an expression.** `(c = getchar()) != EOF` does three things in one line: call `getchar`, assign the result to `c`, compare the same result against `EOF`. The outer parentheses are mandatory — `!=` binds tighter than `=`, so without them you'd get `c = (getchar() != EOF)` which assigns `0` or `1` to `c`. Read that twice; this idiom appears in literally every K&R-style C program.
- **`EOF` comes from `<stdio.h>`** as a `#define`. It is not a character that can appear in a file — it is a signal value returned only by I/O functions when the stream ends. Hitting Ctrl-D on Linux/macOS or Ctrl-Z on Windows from a terminal sends EOF to a running program's stdin.
- **`putchar(c)`** writes the single character `c` to stdout. There's no buffering control here — by default stdout is line-buffered when connected to a terminal and fully buffered when piped. If you want to see output immediately, call `fflush(stdout)` (introduced in chapter 7).

### Variations

Once you have the read-character/write-character skeleton, the body of the loop can do anything. Here are the four shapes K&R walks through. Try replacing the loop body above with each in turn.

**1. Count characters** — the smallest counter program. Notice we don't `putchar` anything until the loop ends.

```c
long nc = 0;
while (getchar() != EOF)
    ++nc;
printf("%ld\n", nc);
```

**2. Count lines** — the byte that ends a line is `\n`, so counting newlines counts lines.

```c
int c, nl = 0;
while ((c = getchar()) != EOF)
    if (c == '\n')
        ++nl;
printf("%d\n", nl);
```

**3. Count blanks, tabs, newlines together** — three counters, one pass.

```c
int c, nb = 0, nt = 0, nl = 0;
while ((c = getchar()) != EOF) {
    if (c == ' ')  ++nb;
    if (c == '\t') ++nt;
    if (c == '\n') ++nl;
}
printf("blanks=%d tabs=%d newlines=%d\n", nb, nt, nl);
```

**4. Count words** — a *word* here is a run of non-whitespace characters. We use a state variable to know whether we're currently inside a word.

```c
#include <stdio.h>

#define IN  1   /* inside a word */
#define OUT 0   /* outside a word */

int main(void) {
    int c, nl = 0, nw = 0, nc = 0, state = OUT;

    while ((c = getchar()) != EOF) {
        ++nc;
        if (c == '\n')
            ++nl;
        if (c == ' ' || c == '\n' || c == '\t')
            state = OUT;
        else if (state == OUT) {
            state = IN;
            ++nw;
        }
    }
    printf("%d lines, %d words, %d chars\n", nl, nw, nc);
    return 0;
}
```

This is the kernel of the Unix `wc` command, in seventeen lines.

## Modern note

A real-world version of `getchar` is the family of `read(2)` system calls: instead of one byte at a time, you ask the kernel for up to `N` bytes into a buffer. `getchar` is `read` with a hidden buffer, called *standard I/O buffering*, that the C runtime manages for you. Modern C programs handling lots of text — log parsers, JSON streams, web servers — use `fread` or `getline` for the same reason: one syscall per chunk is dramatically cheaper than one syscall per byte.

Unicode also complicates this picture. `getchar` reads a *byte*, not a *character* in the human sense. The character "é" might be one byte (Latin-1), two (UTF-8), or four (UTF-32) depending on encoding. C99 added `wchar_t` and `<wctype.h>`; C11 added `char16_t`/`char32_t`. K&R's character-counting programs are still correct if you read "characters" as "bytes" — but if you tell a colleague "I wrote a word counter," they probably expect it to work on Unicode. That's a longer story; for now, ASCII-clean input is the assumption.

## Try it

1. Run the starter. Type two lines, then press **Enter** and **Ctrl-D** (the wasm runtime here treats end-of-input as EOF). The program should echo your text and exit.
2. Replace the loop body with the character-counting snippet above. Type a paragraph; verify it reports the right count. (Newline characters count too!)
3. Now the line counter. What happens if your input doesn't end with a newline? Test it.
4. Word counter: try `the quick brown fox`. Then try `the    quick   brown   fox` (extra spaces). Then `the\tquick\nbrown\nfox` (tabs and newlines). The count should be `4` in all three cases.
5. Break the word counter on purpose: change `state == OUT` to `state = OUT` (single `=`). What does it now report? Why? (This is a classic typo bug — the compiler should warn under `-Wall`.)
6. Add a fourth counter for *digits* (0–9) to the combined version. Hint: `c >= '0' && c <= '9'`.

## Notes from the author

- The book builds this section as four separate programs. I merged them into one lesson with the file-copy as the headline and the four counters as variations. If you want each as its own page when you revise, the manifest already supports more granular ids — split `01-05` into `01-05a-copy`, `01-05b-count-chars`, etc.
- The `(c = getchar()) != EOF` idiom is *the* C idiom. If you write tutorials of your own, you'll come back to it more than once. I deliberately spent a whole bullet on it.
- The Unicode digression in the modern note is the kind of thing K&R never had to address. Worth its own callout box once Chapter 7 lands.
- I picked the `IN`/`OUT` state machine over a single `int prev_was_space` boolean because the named states read better. Both work; the boolean is one line shorter. Pick your style and stick to it.
- A natural follow-up exercise (not in K&R but useful) is to add a `printf` argument to control which counters are shown — turns the toy into a `wc -lwc` clone. Could be a side-quest in your revision.

*Click **next →** to put those counts somewhere — into an array.*
