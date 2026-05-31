---
id: 04-04-scope-rules
chapter: 4
label: "4.4"
title: Scope Rules
prev: ex-4-10
next: 04-05-header-files
status: done
---

**Scope** answers one question: from where in the text is a name visible? C has a small set of rules. A name declared inside a block (including a function body or a `for` header) has **block scope** — visible from its declaration to the closing brace. A name declared outside all functions has **file scope** — visible from its declaration to the end of the file. When an inner declaration reuses an outer name, the inner one **shadows** the outer within its block. Scope is purely lexical: the compiler resolves every name at compile time by walking outward from the point of use.

## Inner names hide outer ones

```c:run shadowing in action
#include <stdio.h>

int g = 100;                    /* file scope */

void show(void) {
    int g = 7;                  /* block scope: shadows the global inside show() */
    printf("inside show, g = %d\n", g);
}

int main(void) {
    show();
    printf("in main, g = %d\n", g);   /* the global — show()'s local is gone */
    return 0;
}
```

```output
inside show, g = 7
in main, g = 100
```

Inside `show`, the name `g` resolves to the local; the global `g` still exists at its fixed address, untouched — `show` simply can't see it by name while shadowed. Back in `main`, `g` refers to the global again. Shadowing is legal but a frequent source of confusion; many style guides forbid it, and `-Wshadow` warns about it. The cure is to give variables distinct, descriptive names rather than reusing `g`, `i`, `tmp` at multiple levels.

## Scope vs lifetime — two independent axes

Don't conflate scope with **lifetime** (storage duration). Scope is *where a name is visible*; lifetime is *how long the object lives*. They're orthogonal: a block-scope `static` variable has narrow scope but whole-program lifetime; a file-scope variable marked `static` has whole-file scope but is *invisible to other files* (internal linkage). That last point is key for large programs: `static` at file scope is how you make a helper function or variable **private to one `.c` file**, preventing name clashes with other files and keeping your module's internals hidden. Forward visibility also matters — a name is only in scope *after* its declaration, which is why prototypes and `extern` declarations go near the top of a file.

## Go deeper
- [Scope (C)](https://en.cppreference.com/w/c/language/scope) — block, file, function, and prototype scope
- [Storage duration & linkage](https://en.cppreference.com/w/c/language/storage_duration) — lifetime and `static`'s two meanings
- [Variable shadowing](https://en.wikipedia.org/wiki/Variable_shadowing) — the inner-hides-outer rule
- [Translation unit](https://en.wikipedia.org/wiki/Translation_unit_(programming)) — the "one file" that file scope refers to
