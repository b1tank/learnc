---
id: 06-08-unions
chapter: 6
label: "6.8"
title: 'Unions'
prev: 06-07-typedef
next: 06-09-bit-fields
status: done
---

A **union** holds one value at a time, but the value can be of any of several declared types. All members share the same storage, so the union's size is the size of its largest member.

```c
union number {
    int    i;
    double d;
    char  *s;
};

union number n;
n.i = 42;       /* now `n` holds an int */
n.d = 3.14;     /* now `n` holds a double; the int is gone */
```

Only the most recently written member is "live". Reading any other member gives implementation-defined behaviour (sometimes well-defined for type-punning, but generally not portable).

## The tagged-union pattern

Because the compiler doesn't track which member is current, you do it yourself with a separate tag:

```c:starter
#include <stdio.h>
#include <string.h>

enum tag { TAG_INT, TAG_DOUBLE, TAG_STRING };

struct value {
    enum tag tag;
    union {
        int    i;
        double d;
        char  *s;
    } u;
};

static void print_value(struct value v) {
    switch (v.tag) {
        case TAG_INT:    printf("int: %d\n",    v.u.i); break;
        case TAG_DOUBLE: printf("double: %g\n", v.u.d); break;
        case TAG_STRING: printf("string: %s\n", v.u.s); break;
    }
}

int main(void) {
    struct value v1 = { .tag = TAG_INT,    .u.i = 42 };
    struct value v2 = { .tag = TAG_DOUBLE, .u.d = 3.14 };
    struct value v3 = { .tag = TAG_STRING, .u.s = "hello" };
    print_value(v1);
    print_value(v2);
    print_value(v3);
    return 0;
}
```

```output
int: 42
double: 3.14
string: hello
```

A tagged union (also called a *sum type* or *variant*) is how dynamic languages represent values internally. Python's `PyObject` is essentially `{ type_pointer, union_of_values }`. JavaScript engines, Lua, every dynamic language — same pattern.

## Sizes

```c
sizeof(union number)
```

is `max(sizeof(int), sizeof(double), sizeof(char*))` plus possibly padding for alignment. On 64-bit, that's typically 8 bytes.

A struct holding all three would be ~24 bytes. The union saves space when only one field is live at a time.

## Type punning (proceed with care)

You can write one member and read another to reinterpret bytes:

```c
union { int i; float f; } x;
x.f = 1.0f;
printf("%x\n", x.i);   /* the bit pattern of 1.0f as an int */
```

This is **implementation-defined** but works on all mainstream compilers. The C standard says "trap representations" might occur in pathological cases; the C++ standard says it's strictly undefined. For portable bit-pattern access, use `memcpy`:

```c
float f = 1.0f;
int   i;
memcpy(&i, &f, sizeof i);    /* well-defined */
```

The compiler optimises this to a free move on every modern target.

## When to use unions

- **Tagged variants**: with an enum tag.
- **Memory-tight data**: when one field is mutually exclusive with another.
- **Hardware registers**: e.g. union of a 32-bit value with a struct of bit-fields representing the layout.
- **NOT for type punning** in modern code — `memcpy` is the portable idiom.

## Try it

1. Add a `TAG_NULL` case to the discriminated union and handle it in `print_value`.
2. Print `sizeof(struct value)` and explain it.
3. Write a function `int as_int(struct value v)` that returns the int value when tag is INT, else 0.

## Notes from the author

- "Tagged union" is one of the most-reinvented concepts. Rust's `enum`, OCaml's variants, Haskell's algebraic types, TypeScript's discriminated unions — all of them are this pattern with compiler-enforced exhaustiveness. C lacks the exhaustiveness check; you have to be disciplined.
- The C++ `std::variant<>` is a tagged union with the tag managed automatically. It's safer but adds template machinery. In plain C, write your own enum + union — it's a few dozen lines.
- The most common bug with unions: writing one member, reading another, getting "garbage". The compiler doesn't warn you. Always check the tag.

*Click **next →** for bit-fields.*
