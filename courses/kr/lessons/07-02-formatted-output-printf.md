---
id: 07-02-formatted-output-printf
chapter: 7
label: "7.2"
title: 'Formatted Output - Printf'
prev: ex-7-1
next: ex-7-2
status: done
---

`printf` converts typed values into text according to a **format string** sprinkled with *conversion specifications* that begin with `%`. Each `%` directive consumes one argument and controls exactly how it's rendered: which type to read it as (`d`, `f`, `s`, `x`, …), how wide the field is, how many digits of precision, and how to pad and align. Mastering the format string means you rarely need manual string-building. The full anatomy of a directive is `%[flags][width][.precision][length]conversion`.

## The conversion zoo

```c:run width, precision, flags, and bases
#include <stdio.h>

int main(void) {
    printf("|%d|%5d|%-5d|%05d|\n", 42, 42, 42, 42);
    printf("|%.3f|%10.3f|%-10.3f|\n", 3.14159, 3.14159, 3.14159);
    printf("|%x|%o|%e|\n", 255, 255, 12345.678);
    printf("|%s|%10s|%-10s|%.3s|\n", "hi", "hi", "hi", "hello");
    printf("|%c|%%|\n", 'A');
    return 0;
}
```

```output
|42|   42|42   |00042|
|3.142|     3.142|3.142     |
|ff|377|1.234568e+04|
|hi|        hi|hi        |hel|
|A|%|
```

Read the bars as field boundaries. `%5d` right-justifies in a 5-wide field (3 leading spaces); `%-5d` left-justifies (trailing spaces); `%05d` pads with zeros. For floats, `.3` is *precision* - `%.3f` keeps 3 digits after the point (rounding `3.14159` to `3.142`), and width and precision combine in `%10.3f`. `%x` and `%o` print in hex and octal; `%e` uses scientific notation. For strings, width sets a minimum field while `.3` *truncates* to at most 3 characters (`hello` → `hel`). And `%%` is how you print a literal percent sign, since a bare `%` starts a directive.

## Type matching is on you - and the security trap

`printf` is **variadic**: it discovers its argument types only by *parsing the format string at runtime*, then pulls each argument off the stack/registers assuming the matching type. There's no compile-time check that your `%d` actually received an `int` - pass a `double` to `%d`, or forget an argument, and `printf` reads the wrong bytes and prints garbage or crashes. The matching length modifiers matter for the same reason: use `%ld` for `long`, `%lld` for `long long`, `%zu` for `size_t`, `%f` for `double` (which is also correct for a `float`, since floats are promoted to double when passed to a variadic function). The gravest mistake is `printf(user_string)` - passing untrusted text *as* the format. If that text contains `%x` or `%n`, an attacker can read your stack or even write to memory; this is the classic [format-string vulnerability](https://en.wikipedia.org/wiki/Uncontrolled_format_string). The fix is trivial and absolute: always write `printf("%s", user_string)`. Two siblings round out the family: `sprintf(buf, fmt, …)` formats into a string (prefer `snprintf` with a size limit to avoid overflow), and `fprintf(stream, fmt, …)` writes to any stream, such as `stderr`.

## Go deeper
- [`printf` format spec](https://en.cppreference.com/w/c/io/fprintf) - every flag, width, and conversion
- [`printf(3)` man page](https://man7.org/linux/man-pages/man3/printf.3.html) - the canonical reference
- [Variadic functions](https://en.wikipedia.org/wiki/Variadic_function) - how `printf` reads its args
- [Format string attack](https://owasp.org/www-community/attacks/Format_string_attack) - why never to pass user text as the format
