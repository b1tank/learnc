---
id: 01-10-external-variables-and-scope
chapter: 1
label: "1.10"
title: External Variables and Scope
prev: ex-1-20
next: ex-1-21
status: done
---

Every variable you've declared so far has been **local** — born inside `main` or a helper, alive only for the duration of that function call, invisible to everyone else. That works when the data is small and the call graph is flat. The moment you need two functions to share a buffer (say, the line-reading helper and the line-copying helper from §1.9), passing it as an argument starts to feel like ceremony. C offers an alternative: declare the buffer *outside* any function, at **file scope**, and any function in the file can see it. These are *external variables*, and they introduce the language's notions of scope and lifetime.

The rewrite of the longest-line program below uses three externals — `line`, `longest`, `max` — instead of passing them through arguments. Compare it line-for-line against §1.9.

```c:starter
#include <stdio.h>

#define MAXLINE 1000

int  max;                /* longest length seen so far */
char line[MAXLINE];      /* current input line */
char longest[MAXLINE];   /* longest line saved so far */

int  read_line(void);
void copy_line(void);

int main(void) {
    int len;

    while ((len = read_line()) > 0) {
        if (len > max) {
            max = len;
            copy_line();
        }
    }

    if (max > 0)
        printf("longest line (%d chars):\n%s", max, longest);
    return 0;
}

/* read_line: read a line into the external `line`, return length */
int read_line(void) {
    int c, i = 0;
    while (i < MAXLINE - 1 && (c = getchar()) != EOF && c != '\n')
        line[i++] = c;
    if (c == '\n')
        line[i++] = '\n';
    line[i] = '\0';
    return i;
}

/* copy_line: copy external `line` into external `longest` */
void copy_line(void) {
    int i = 0;
    while ((longest[i] = line[i]) != '\0')
        ++i;
}
```

```output
```

## What's going on

- **`line`, `longest`, and `max` live outside every function.** They have *file scope* (visible from their declaration to the end of the file) and *static storage duration* (they exist for the entire run of the program, not just for one function call). Their lifetime spans the whole `main`, every call to `read_line`, every call to `copy_line`.
- **Externals are zero-initialised by default.** `int max;` at file scope is the same as `int max = 0;`. The same is true for character arrays — `line[0]` through `line[MAXLINE-1]` all start as `'\0'`. Local variables, by contrast, start as garbage. This rule will save you a few lines and bite you a few times.
- **No more arguments to thread through.** `read_line` now has zero parameters; it just reads characters into the global `line`. `copy_line` reads `line`, writes `longest`. The function signatures got smaller and `main` is a touch cleaner — but every helper is now *coupled* to the names `line` and `longest`. They aren't generic anymore; you can't call them on a different pair of buffers without renaming.
- **`extern` is how other files see externals.** If `longest` were defined in `main.c` and you wanted to read it from `print_summary.c`, you'd put `extern char longest[];` near the top of `print_summary.c`. The `extern` declaration says "this name exists, defined in some other translation unit; the linker will resolve it." The *definition* (without `extern`) reserves storage; *declarations* (with `extern`) just announce the name. A program needs exactly one definition per external variable and as many declarations as files that use it.
- **Scope vs lifetime — different axes.** *Scope* is "where in the source can I write this name and have it bind to this entity." *Lifetime* is "how long does the entity's storage exist." A function-local `int i` has function scope and automatic lifetime. A `static int i` inside a function has function scope but *static* lifetime — it survives between calls. An external `int i` has file scope and static lifetime. C lets you mix and match.

## Modern note

The first time you read this section in K&R, it feels like a liberation. The second time, after maintaining a real codebase with externals scattered through it, it feels like a warning.

Externals are convenient when:

- The data is *truly* one-of-a-kind (a singleton config struct, an error log handle).
- Passing it around would obscure the algorithm (a hash table the parser, lexer, and emitter all stab at).
- You're writing tight embedded code where every byte of stack and every register save counts.

Externals hurt when:

- Two parts of the program decide to use the same name for unrelated things.
- A function's behaviour now depends on hidden state, so calling it twice with the "same inputs" produces different outputs.
- You want to test a function in isolation and find you have to recreate a whole world of globals first.

Modern C practice splits the middle: keep most state inside a struct passed by pointer (`struct app *ctx`), use `static` at file scope for *truly* file-local helpers (private to one .c file), and reserve full file-scope externals for the rare cases where the singleton story is honest. The Linux kernel, SQLite, and the Lua interpreter are all studies in disciplined external use.

C99/C11 also gave us a vocabulary you'll see in real code:

- `static int x;` *at file scope* is **internal linkage** — visible inside this .c file, invisible outside. The right default for helpers.
- `extern int x;` is a **declaration** — names something defined elsewhere. Goes in headers.
- `int x;` at file scope is a *tentative* definition. The linker turns it into a real one with value zero unless you've defined it explicitly elsewhere.
- C23 deprecates the `auto` storage class (now repurposed as a C++-style type-deduction keyword). The old `auto int x;` meaning "local with automatic lifetime" is what you get by default anyway.

## Try it

1. Run the starter. Same input as §1.9 should produce the same output — the algorithm didn't change, only the plumbing did.
2. Add a `printf` inside `read_line` that prints `line` after building it. Then add another one inside `copy_line` that prints `longest` after copying. You'll see how shared state evolves with each call.
3. *Shadowing experiment.* Inside `read_line`, declare a local `int max = 99;`. Compile and run. Does the longest-line tracking still work? (Answer: yes, because the local `max` shadows the external `max` *only inside `read_line`*. Outside, the external is unchanged.) Now move that declaration outside `read_line` and see the difference.
4. *Initialisation experiment.* Remove the explicit `int max;` declaration and add `static int max = 0;` *inside* `main`. Compile. Does it still link? What changed about `max`'s scope and lifetime?
5. Split this into two files: `main.c` containing `main` and the externals; `lines.c` containing `read_line` and `copy_line` with `extern` declarations for the externals. Compile with `cc main.c lines.c -o longest`. (The wasm runtime here doesn't support multi-file projects; do this on your local machine if you have a compiler installed.)
6. Refactor *back* to the §1.9 style: turn the externals into parameters of the helpers. Which version do you prefer? At what number of helpers does each approach win?

## Notes from the author

- This is the most opinionated lesson in Chapter 1. K&R presents externals as a useful tool; I framed them as something you reach for sparingly. That's the consensus of the post-K&R community — including, for the record, the Linux kernel's coding style — but it's an opinion. Adjust to taste when you revise.
- The scope-vs-lifetime distinction is the headline. The `extern` mechanics are a footnote until you start working across multiple `.c` files; before that they look like noise.
- Experiment #3 (shadowing) is worth its own callout. Most readers have never thought about what happens when a local and a global share a name; the answer ("nothing surprising, the local wins inside its scope") is reassuring once you say it out loud.
- I gave the multi-file experiment as #5 even though our in-browser compiler can't do it. The reason it's still here: it's the *only* time `extern` matters. If you ever revise into something with a multi-file compile-link demo, this is where the link belongs.
- After this section the K&R chapter ends. Click `next →` to start working through the exercises in order — solutions follow K&R's progression but every program is rewritten from scratch.

*Click **next →** to start the Chapter 1 exercises.*
