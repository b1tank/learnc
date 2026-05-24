---
id: 01-09-character-arrays
chapter: 1
label: "1.9"
title: Character Arrays
prev: 01-08-arguments-call-by-value
next: 01-10-external-variables-and-scope
status: done
---

C has no built-in `string` type. What it has are *arrays of `char`* — a row of byte-sized integers — and a convention: a string is "a sequence of characters terminated by a zero byte." That zero byte (`'\0'`, value zero, **the null terminator**) is the sentinel that turns a fixed-size array into a variable-length string. Everything the standard library calls a "string" — `strlen`, `strcpy`, the format `%s` in `printf` — operates on this convention.

The example below is the canonical first character-array program: read input one line at a time and report the longest line seen. It uses three small functions instead of one giant `main`, which is also a chance to practice the function discipline from §1.7 and 1.8.

```c:starter
#include <stdio.h>

#define MAXLINE 1000   /* maximum input line length */

int  read_line(char line[], int maxsize);
void copy_line(char dest[], const char src[]);

int main(void) {
    char line[MAXLINE];     /* current input line */
    char longest[MAXLINE];  /* longest seen so far */
    int  len;
    int  max = 0;

    while ((len = read_line(line, MAXLINE)) > 0) {
        if (len > max) {
            max = len;
            copy_line(longest, line);
        }
    }

    if (max > 0)
        printf("longest line (%d chars):\n%s", max, longest);
    return 0;
}

/* read_line: read one line into s, return length */
int read_line(char s[], int maxsize) {
    int c, i = 0;
    while (i < maxsize - 1 && (c = getchar()) != EOF && c != '\n') {
        s[i++] = c;
    }
    if (c == '\n')
        s[i++] = '\n';
    s[i] = '\0';
    return i;
}

/* copy_line: copy src to dest; assume dest is big enough */
void copy_line(char dest[], const char src[]) {
    int i = 0;
    while ((dest[i] = src[i]) != '\0')
        ++i;
}
```

```output
```

Type a few lines of text into the input pane (the second line longer than the first, or any other mix), then EOF. The longest one comes back.

## What's going on

- **`char line[MAXLINE];`** reserves room for 1000 bytes. That's not 1000 characters of *content*: at least one byte at the end has to be the `'\0'` terminator, so the program can hold lines up to 999 characters long. The `maxsize - 1` in `read_line` is what enforces that.
- **`read_line` returns the length excluding the terminator.** That makes the loop in `main` natural: `len > 0` means "we read at least one character." If `read_line` hits EOF on an empty stream the first thing it does, it returns `0` and the loop exits.
- **Why a separate `'\n'` capture?** The `read_line` loop stops on either `EOF` or `\n`. We want to *include* the trailing newline in the stored line if it was a newline that ended it (it's useful when we print the longest line later), but not include EOF as a character. So after the loop, we ask which exit condition triggered.
- **The null terminator is *added by you*.** No language feature appends `'\0'` for you. Every C string-building function ends with the equivalent of `s[i] = '\0';`. Forget that line and every downstream call — `printf("%s", s)`, `strlen(s)` — will read past your data into whatever happens to live next door, until it stumbles into a zero byte. That's where the term *buffer overread* comes from.
- **`copy_line` is `strcpy` in three lines.** The body assigns one character then *uses the assigned value as the loop condition* (`(dest[i] = src[i]) != '\0'`). This is the dense, idiomatic shape of C — assignment as expression, loop condition tucked into the body, terminator handled implicitly because it's a zero. Don't try to make it more readable until you can read it; once you can, you'll see it everywhere.
- **`const char src[]`** in the function signature says "I won't modify `src` inside this function." It's compiler-checked: try to assign to `src[i]` inside `copy_line` and the build fails. This is the modern way to communicate intent to the caller. The historical K&R signature omits `const`; we're moving with the times.

## Modern note

The standard library already ships these functions: `<string.h>` declares `strcpy`, `strlen`, `strcmp`, `strncpy`, `strncat`, and so on. Most of them are dangerous for the same reason `copy_line` above is dangerous: they trust the caller to provide buffers big enough for the result. `strcpy(dest, src)` will happily overflow `dest` if `src` is longer than you assumed.

A short cheat sheet for new C code:

- **Always carry sizes alongside char buffers.** Pass `char buf[]` *and* `size_t cap` together, not `buf` alone. Every modern C codebase eventually re-invents this discipline.
- Prefer `snprintf(buf, sizeof buf, "…")` over `sprintf(buf, "…")`. The `n` family takes a max size; the unbounded forms are unconditionally hazardous.
- POSIX adds `getline()` (note: different from this lesson's `read_line`) that *allocates* the buffer for you using `malloc`. C has no standard equivalent.
- C11 added the *bounds-checking* `_s` variants (`strcpy_s`, `strcat_s`, etc.) under Annex K. Adoption is uneven — clang doesn't ship them, glibc ignores them. Most modern projects roll their own size-carrying string types or use `string_view` / `std::string` if they can switch to C++.

The pattern in the starter — a fixed-size stack buffer plus an explicit max — is the cheapest safe option in plain C. The next step up is dynamic allocation with `malloc`/`realloc`, which lands properly in chapter 5.

## Try it

1. Run the starter. Paste two lines, one longer than the other. The longest should print back.
2. Add a counter for *number of lines read* and print it after the loop. Where in `main` does that counter live, and why doesn't it have to be passed to `read_line`?
3. Change `MAXLINE` to a tiny value like `8`. Type a long line. `read_line` should truncate without crashing — that's what the `i < maxsize - 1` guard is for. Verify the longest-line tracking still makes sense.
4. Add a second helper, `int line_length(const char s[])`, that walks the string until it hits `'\0'` and returns the count. Use it inside `main` instead of the length returned by `read_line`. Compare results.
5. Remove the `s[i] = '\0';` line at the end of `read_line`. What happens when `main` then prints `longest`? Run it and see — but think about what *should* happen first. The behaviour is undefined; you may see garbage, you may see nothing, you may segfault.
6. Stretch: write `void reverse_in_place(char s[])` that reverses a string by swapping characters from the two ends inward, stopping at the middle. The first `i < j` swap takes one character from each end; the next moves both indices inward by one. Don't use `<string.h>`.

## Notes from the author

- I split K&R's combined function (which both reads the line and tracks length in one helper) into the same shape but emphasised the null terminator more aggressively, because that's where most students first burn themselves. If you'd rather show the inline `for` form of the loop, the K&R version is shorter.
- `copy_line`'s one-line body (`while ((dest[i] = src[i]) != '\0') ++i;`) is the second most-cited C idiom after `(c = getchar()) != EOF`. Worth a separate "C idioms you'll meet" page once chapter 5 lands.
- The `const char src[]` signature is a small modernisation. K&R doesn't have `const`; modern API design depends on it. When you revise §4.1 (Basics of Functions), pull this thread.
- I didn't introduce `strlen`, `strcpy` from `<string.h>` here because the whole point of this section is to *show* how those functions are built. They become natural in chapter 5 once pointers come online. Mention them in passing if you want, but leave the implementation in the starter so the magic isn't.
- A natural next experiment (omitted to keep the lesson tight): write the same program with two pointers walking the array instead of indices `i`. Same algorithm, completely different aesthetic. It is the bridge into §5.3.

*Click **next →** to learn where global state lives, what `extern` actually does, and why everyone keeps telling you to avoid globals.*
