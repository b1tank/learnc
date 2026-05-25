---
id: 01-08-arguments-call-by-value
chapter: 1
label: "1.8"
title: Arguments — Call by Value
prev: ex-1-15
next: 01-09-character-arrays
status: done
---

When you call a function in C, the arguments are *copied* into fresh local variables that live for the lifetime of the call. The function works on the copies. When it returns, the copies are thrown away. The caller's variables are untouched, no matter what the function did to its parameters.

This rule has a name — **call by value** — and it is the single most important thing to internalise about C function calls. It explains why pointers exist, why C strings are passed the way they are, and why "the function changed my variable" is almost always a misunderstanding.

```c:starter
#include <stdio.h>

/* power: raise base to the n-th power; n >= 0.
   We're allowed to chew on `n` because it's a private copy. */
int power(int base, int n) {
    int result = 1;
    while (n > 0) {
        result = result * base;
        --n;            /* this only modifies our local copy */
    }
    return result;
}

int main(void) {
    int exponent = 5;
    int answer = power(2, exponent);

    printf("2^%d = %d\n", exponent, answer);
    printf("after the call, exponent is still %d\n", exponent);

    return 0;
}
```

```output
2^5 = 32
after the call, exponent is still 5
```

## What's going on

- **Two `n`s, two memory cells.** When `main` calls `power(2, exponent)`, the value of `exponent` (which is `5`) is *copied* into a new int called `n` that belongs to `power`'s stack frame. The decrements inside `power` change that copy down to zero. The original `exponent` back in `main` never moves.
- **This lets `power` be sloppier than before.** In §1.7 we kept `n` pristine and used a separate `i` counter. Now we just count `n` down because we own the copy. Fewer locals, same answer. This is a standard trick: when you receive an argument by value, treat it like any other local — mutate it freely if it makes the code clearer.
- **There is no `byref` in C.** Many languages (C++, C#, Pascal) let the caller mark an argument so the function gets a reference instead of a copy. C does not. If a function needs to modify the caller's variable, the caller must pass the *address* of the variable (`&exponent`) and the function takes a *pointer* parameter (`int *n`). That's chapter 5; for now, you only need to know the mechanism *doesn't* exist.
- **Arrays are the one exception — and it's not really an exception.** Pass an array name and what actually travels into the function is a pointer to the array's first element, not a copy of the array. So changes inside the function *are* visible to the caller. We'll meet this in the next lesson; the rule "call by value" still holds, you just happen to be copying a pointer.
- **Returning is the only way out.** Because parameters are copies, the *only* mechanism for a value-returning function to give something to its caller is via `return`. Want to return two things? Return a struct (chapter 6), or pass in pointers the function can fill (chapter 5), or stash a value in a global (chapter 1.10, but resist).

## Modern note

If you came from Python, JavaScript, or Java, you've heard "objects are passed by reference." That isn't quite true, and the C version of the same idea makes it clearer.

- In Java, the *reference* (a small handle pointing into the heap) is passed by value. Reassigning the parameter doesn't change the caller's variable, but mutating the object the reference points to *is* visible to the caller. C does this too — pass an `int *p`, and you can't change which variable the caller's `p` points to (that's still a copy), but you can write to `*p` and the caller will see the new value.
- C's call-by-value is more honest because the mechanism is exposed. You can see, in the source, whether a parameter is a pointer or a plain value. Java hides the indirection inside the language; C makes you spell it.
- "Pass by reference" in a strict sense exists in C++ (`int &n`) and Rust (`&mut i32`) but not in C. C programmers say "pass a pointer" and mean the same thing.

A practical consequence: in a profiler-driven world, copying large structs by value can be expensive. The idiom `void process(const struct large *p)` — pass a pointer, marked `const` so the function can't lie about not changing it — is how C codebases avoid the copy without giving up safety.

## Try it

1. Run the starter. The trick is the second `printf` — `exponent` is still `5` even though `n` was zeroed inside `power`.
2. Now break call-by-value's illusion: declare `int n` outside `main` as a global, remove the parameter, and have `power` read it directly. The function still works, but `power` is now coupled to a global — much harder to test in isolation. This is why global state hurts; functions stop being self-contained.
3. Sketch — don't compile yet — a version of `power` that returns *both* the result and the number of multiplications performed. How many ways can you think of? (Possible answers: a struct, two pointer parameters, a global. We'll see all three in later chapters.)
4. Write a `void swap(int a, int b)` that tries to swap two `int`s. Call it like `swap(x, y)` and print `x` and `y` afterwards. Nothing changes — explain why before reading on. (Spoiler: `swap` swapped its local copies, then returned.)
5. Look at the assembly: open a separate tab with [godbolt.org](https://godbolt.org/), paste the starter, and watch the compiler emit a `mov` instruction that copies `exponent` into the register/stack slot used for `power`'s `n`. The copy is *literally* a CPU instruction.

## Notes from the author

- This section is conceptually short but architecturally huge. K&R gets it across in one page; I expanded it because the call-by-value rule is the *prerequisite* for understanding pointers in chapter 5 and the difference between C and every memory-managed language. When you revise, you might leave this lesson short and trust that future lessons will revisit the rule.
- The Java/Python comparison in the modern note is a magnet for "well, actually" arguments. I tried to thread it carefully — but if you don't have a Java/Python background you can cut that paragraph without losing anything.
- Experiment #4 (the broken `swap`) is the *classic* moment when call-by-value clicks. Some teaching tracks make it the entire lesson and skip the `power` rewrite. Decide which you find more memorable.
- I avoided the word "argument" vs "parameter" semantic policing on purpose. Some texts insist "parameter" = the variable in the function signature, "argument" = the value at the call site. K&R itself isn't consistent; modern usage isn't either. Use whichever feels right.

*Click **next →** to meet C's least-glamorous data structure: the character array.*
