---
id: 02-dismantling-hello-world
chapter: 1
label: "1.2"
title: Dismantling Hello, world - stdio, headers, functions
prev: 01-hello-world
next: 03-local-variable-lifetimes
status: draft
source:
  videoId: Z84vlG1RRtg
  url: https://www.youtube.com/watch?v=Z84vlG1RRtg
---

> **Source video.** [Let's Learn C - lesson 2](https://www.youtube.com/watch?v=Z84vlG1RRtg) by Salvatore Sanfilippo (antirez).

## TL;DR

Hello, world is small but every token in it is doing real work. This lesson pulls it apart: what `stdio` actually is and why we `#include` it, how `int main(void)` and any other function are shaped (return type, parameter list, body), what happens when you define a second function and call it from `main`, and a first hint at the fact that arguments and locals only exist while the function is running.

## The standard I/O header `[00:00]`

`stdio` is an abbreviation of *standard I/O*. The header `<stdio.h>` declares the input/output functions of the C standard library - `printf`, `puts`, `scanf`, `fopen`, and friends - so the compiler knows their signatures. The implementations themselves live in libc and get linked in at the end. You *could* hand-write a prototype for `printf` instead of including the header (the previous lesson did exactly that), but in real code you always include the header.

## The shape of a function `[00:40 → 03:20]`

Every C function has the same skeleton:

```
return-type  name (parameter-list) { body }
```

So `int main(void)` says: returns `int`, named `main`, takes no arguments. The explicit `void` matters. Writing `int main()` is technically legal in modern C but means "unspecified arguments" rather than "no arguments" - the compiler can't warn you if you accidentally pass some. Compile with `-Wall -Wextra` and prefer `void` when a function takes nothing.

## Defining and calling another function `[03:20 → 05:53]`

`main` is special only in that the OS calls it for you. Any other function you define has to be called explicitly. Here we define a tiny `sum(int a, int b)` and call it from `main` through `printf`:

```c:run define and call sum()
#include <stdio.h>

int sum(int a, int b) {
    return a + b;
}

int main(void) {
    printf("Hello, %d\n", sum(10, 20));
    return 0;
}
```

```output
Hello, 30
```

The format string `"%d"` tells `printf` that an `int` argument will follow - `printf` is *variadic*, so it relies on the format string to know what's actually on the stack. If the format string and the actual arguments disagree (e.g. you promise two `%d` but supply one), `gcc` will warn even without `-Wall`, and the runtime behaviour is undefined - it might print `0`, garbage, or crash. `[07:16 → 08:11]`

`sum` is declared *above* `main` so the compiler has already seen its prototype by the time `main` calls it. If you flip the order, you'll either get an implicit-declaration warning or an error depending on the standard - fix it by either moving the definition up or adding a forward prototype (`int sum(int, int);`) before `main`.

## main is special - and required `[08:42 → 09:52]`

`main` is the one function nobody calls explicitly - it's the entry point the OS jumps to for you. That specialness shows up in two concrete ways.

First, you can't write statements at the top level; every statement has to live inside some function. Drop a bare `printf` at file scope and the compiler rejects it before it even reaches code generation:

```c
#include <stdio.h>
printf("hello\n");   /* at file scope, not inside any function */

int main(void) { return 0; }
```

```output
scope.c:2:8: error: expected declaration specifiers or '...' before string constant
    2 | printf("hello\n");
      |        ^~~~~~~~~
```

Second, the symbol really has to be named `main`. Rename it to `pippo` and compilation gets all the way through to *linking* before it fails - the C runtime startup code (`Scrt1.o`, which provides `_start`) needs a `main` to call:

```
cc rename.c
```

```output
/usr/bin/ld: .../Scrt1.o: in function `_start':
(.text+0x1b): undefined reference to `main'
collect2: error: ld returned 1 exit status
```

The error comes from `ld`, the linker, not the compiler: each `.c` compiles fine on its own, but the final link can't find the `main` symbol that `_start` expects.

## Locals live only while the function runs `[15:08 → 17:30]`

When `sum(10, 20)` is called, space appears for `a`, `b`, and any local `c` you declare inside. The moment `sum` returns, all three are gone - their storage will be reused by the next call. Function arguments are just locals that the caller pre-fills for you. Holding onto their address after the function returns is a bug (we'll meet pointers later). The appendix video to this lesson shows this on actual assembly; the next lesson here picks up the same thread.

## Why main returns an int `[17:30 → 20:31]`

The return value of `main` is the program's exit status, visible to the shell as `$?`. Zero means success; non-zero means failure. This is what makes `./build && ./test && ./deploy` work - the shell's `&&` short-circuits the moment any command returns non-zero. Try it on the program above:

```
cc -o demo sum.c
./demo; echo "exit status: $?"
```

```output
Hello, 30
exit status: 0
```

## What the compiler does to your function

The video keeps `sum` as a real function call, but that is not what the CPU ends up running once the optimiser is involved. Compile with `cc -O2 -S -masm=intel` and look at the two functions separately.

`sum` on its own collapses to a **single instruction**:

```asm
sum:
        endbr64
        lea     eax, [rdi+rsi]   ; eax = a + b, computed via address arithmetic
        ret
```

The System V ABI passes the first two `int` arguments in `edi` and `esi` (the 32-bit halves of `rdi`/`rsi`), and the return value comes back in `eax`. The compiler uses `lea` - "load effective address" - purely as a cheap two-input adder: `[rdi+rsi]` is an addressing expression, but no memory is touched; the computed sum just lands in `eax`. One instruction, no stack frame.

Now look at `main`. The call to `sum(10, 20)` has **vanished entirely**:

```asm
main:
        endbr64
        sub     rsp, 8           ; align the stack to 16 bytes before a call
        mov     esi, 30          ; second printf arg = sum(10,20), folded to 30
        lea     rdi, .LC0[rip]   ; first arg = address of "Hello, %d\n"
        xor     eax, eax         ; 0 vector registers used by this variadic call
        call    printf@PLT
        xor     eax, eax         ; return 0
        add     rsp, 8
        ret
```

The optimiser **inlined** `sum`, saw that both arguments were the constants `10` and `20`, and **constant-folded** the call into the literal `30` (`mov esi, 30`). The function you wrote is still in the binary (other code might call it), but the call site in `main` pays nothing for it. This is the everyday reality of C: the *semantics* you wrote are preserved exactly, while the *steps* the CPU runs can be dramatically simpler than the source. See the [asm primer](00-asm-primer.md) for the register and calling-convention details, or open the same code in [Compiler Explorer](https://godbolt.org/).

## Cross-reference to K&R

This is the same ground as [K&R § 1.7 - Functions](../../kr/lessons/01-07-functions.md): return types, parameter lists, calling a user-defined function from `main`, and what "returning a value" means.

## Go deeper

- [`man 3 printf`](https://man7.org/linux/man-pages/man3/printf.3.html) and [`man 3 stdio`](https://man7.org/linux/man-pages/man3/stdio.3.html) - what `<stdio.h>` actually pulls in.
- [cppreference: `<stdio.h>`](https://en.cppreference.com/w/c/io) - the full list of declarations.
- [cppreference: functions](https://en.cppreference.com/w/c/language/functions) - the exact rules for declarations, definitions, and `void` parameter lists.
- [Wikipedia: translation unit](https://en.wikipedia.org/wiki/Translation_unit_(programming)) - the unit of compilation that `#include` quietly assembles for you.

*Click **next →** to follow locals onto the stack.*
