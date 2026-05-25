---
id: 04-08-block-structure
chapter: 4
label: "4.8"
title: Block Structure
prev: 04-07-register-variables
next: 04-09-initialization
status: done
---

C allows declarations inside any `{ ... }` block, not just at the top of a function. Each block opens a new scope.

```c:starter
#include <stdio.h>

int main(void) {
    int x = 1;
    printf("outer x = %d\n", x);

    {
        int x = 10;             /* shadows outer x */
        printf("inner x = %d\n", x);

        {
            int x = 100;
            printf("innermost x = %d\n", x);
        }

        printf("inner x again = %d\n", x);
    }

    printf("outer x again = %d\n", x);
    return 0;
}
```

```output
outer x = 1
inner x = 10
innermost x = 100
inner x again = 10
outer x again = 1
```

Each inner `x` is a distinct variable; when the closing `}` is reached, the inner `x`'s storage is reclaimed and the outer name is visible again.

## What block structure is good for

1. **Limiting variable lifetime.** Declare locals at their first use, inside the narrowest block that needs them.
2. **Resource scoping.** Acquire a resource at the top of a block, release at the bottom. No leaks because the path through is linear.
3. **Avoiding name collisions.** A short-lived helper variable doesn't pollute the function's scope.

```c
if (need_to_swap) {
    int tmp = a;          /* tmp lives only here */
    a = b;
    b = tmp;
}
/* tmp is gone */
```

The discipline pays off in long functions: instead of a sea of declarations at the top, each block declares only what it uses.

## When NOT to abuse it

Nested blocks beyond two levels deep are a code smell. If you find yourself opening blocks just to limit variable scope, ask: should this be a separate function instead? Function-level scoping is the right tool for big chunks of logic; block-level scoping is for tiny inner sections.

## Modern note

C99 added "declarations may appear anywhere statements may appear" — you don't have to put them at the top of a block. Modern style: declare each variable at the line where it's first used. The narrower the scope, the less mental overhead for the reader.

```c
/* Pre-C99 style — all declarations at top */
int main(void) {
    int i, sum;
    sum = 0;
    for (i = 0; i < 10; ++i)
        sum += i;
    return sum;
}

/* C99+ style — declare at first use */
int main(void) {
    int sum = 0;
    for (int i = 0; i < 10; ++i)
        sum += i;
    return sum;
}
```

The second is the modern norm. Older compilers (MSVC pre-2013) didn't support it; that limitation is long gone.

## Try it

1. Replace a long function with several small scoped blocks. See how readable each section becomes.
2. Use a scoped block for the classic three-line swap idiom. The temporary doesn't leak into outer scope.
3. Enable `-Wshadow` and watch the compiler flag every shadowed name. Most production teams treat `-Wshadow` warnings as errors.

## Notes from the author

- "Declare at first use" is a habit worth building. Pre-C89 forced you to declare at the top of the function; modern code lets you put the variable next to where it's actually used. Cleaner, easier to refactor (you can move a block of code with its declarations as a unit).
- Shadowing is one of those things that's "technically legal" and almost always a bug. Turn on `-Wshadow` in your build. The cost is occasionally renaming a variable; the benefit is catching a real bug class.
- The "scope = block" rule is simpler than the corresponding rule in C++ (which has classes, namespaces, templates...). Enjoy the simplicity while it lasts.

*Click **next →** for initialisation rules.*
