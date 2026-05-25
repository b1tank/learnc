---
id: 04-01-basics-of-functions
chapter: 4
label: "4.1"
title: Basics of Functions
prev: 03-08-goto-and-labels
next: ex-4-1
status: done
---

A function is a named, reusable block of code with typed inputs and one typed output (or none). The syntax:

```
return-type  function-name (parameter-list) {
    declarations
    statements
}
```

`main` is just a function with a special name; the runtime calls it for you.

```c:starter
#include <stdio.h>
#include <string.h>

/* function prototype: types of params and return, no body */
int strindex(const char s[], const char t[]);

int main(void) {
    char haystack[] = "the quick brown fox";
    char needle[]   = "brown";

    int pos = strindex(haystack, needle);
    if (pos >= 0)
        printf("found '%s' at index %d\n", needle, pos);
    else
        printf("not found\n");
    return 0;
}

/* full function definition */
int strindex(const char s[], const char t[]) {
    int i, j, k;

    for (i = 0; s[i] != '\0'; ++i) {
        for (j = i, k = 0; t[k] != '\0' && s[j] == t[k]; ++j, ++k)
            ;
        if (k > 0 && t[k] == '\0')
            return i;
    }
    return -1;
}
```

```output
found 'brown' at index 10
```

## Three pieces of every function

1. **Prototype (declaration).** Tells the compiler the name, return type, and parameter types. Lives in a header or near the top of the file. No body — just `int strindex(const char s[], const char t[]);`.
2. **Definition.** The real function with its body. Lives anywhere in the same or another translation unit.
3. **Call site.** Wherever you write `strindex(args...)`. The compiler needs the prototype in scope here so it can type-check the arguments.

If you call a function whose prototype the compiler hasn't seen, ANSI/ISO C99+ requires a diagnostic. (K&R-era C was looser — it assumed `int` return and let you pass anything; that's how the world got `printf` with no header for decades. Don't do that.)

## `void` is your friend

Two uses:

- `void foo(void)` — function takes no parameters and returns nothing. Without the inner `void`, `foo()` in a *declaration* means "unspecified parameters" (a pre-ANSI hangover); compilers won't complain if you call `foo(1, 2, 3)`. Always write `(void)`.
- `void *p` — generic pointer (covered later in Ch 5). Doesn't apply here.

## `return`

`return expr;` exits the function and yields `expr` (converted to the function's return type) to the caller. A bare `return;` is only legal in `void` functions. Falling off the end of a non-`void` function without a `return` is undefined behaviour.

## Modern note

- C99 added the prototype with `void` mandatory for "no parameters". K&R-style `int f()` (which means "unknown params") still compiles but is poor style — older compilers may pass extra args silently.
- Use `const` on pointer parameters that you don't modify: `int strindex(const char s[], const char t[])`. Both documents intent and lets the compiler optimise.
- Use `static` (covered in §4.6) on functions used only within one `.c` file — it limits visibility and gives the compiler more inlining freedom.

## Try it

1. Add a third parameter to `strindex` that returns the count of matches found. Practise multiple return values via pointer-out parameters.
2. Forget the prototype: delete the `int strindex(...)` line above `main` and recompile with `-Wall`. Read the warning. Now compile without `-Wall`. Compare.
3. Write a function `int max3(int a, int b, int c)` and call it from `main`. Try passing it floats and watch the conversion.

## Notes from the author

- A function with no `return` value in a non-`void` return type is the most common UB in beginner C. Some compilers will still emit code that returns "whatever was in the return register" — a security disaster waiting to happen. Always end with `return;` or `return value;`.
- Modern C style: short functions (under 50 lines), one purpose each, named after a verb-or-action (`parse_header`, not `header_thing`). Naming is the only real way to keep a large codebase readable.
- Prototypes in headers are also a contract: when a function's signature changes, the compiler will warn at every caller that doesn't match. That's how you catch API drift in a 50-file codebase.

*Click **next →** for non-integer return types.*
