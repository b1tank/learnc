---
id: 06-07-typedef
chapter: 6
label: "6.7"
title: 'Typedef'
prev: 06-06-table-lookup
next: 06-08-unions
status: done
---

`typedef` creates a **type alias**. It doesn't introduce a new type, just a new name for an existing one.

```c
typedef int  Length;          /* Length is an alias for int */
typedef char *String;         /* String is an alias for char* */

Length n = 5;                  /* same as int n = 5; */
String s = "hello";            /* same as char *s = "hello"; */
```

## Why use `typedef`

1. **Readability**: `Length` documents intent that `int` doesn't.
2. **Portability**: `typedef long long Int64;` lets you change the underlying type by editing one line.
3. **Abstraction**: hide complex types behind a friendly name.
4. **Tagged structs**: drop the `struct` keyword.

## Typedef'd structs

```c
typedef struct point {
    int x;
    int y;
} Point;

Point p;        /* not 'struct point p' */
```

You can even leave out the tag if you don't need to forward-declare or self-reference:

```c
typedef struct {
    int x;
    int y;
} Point;
```

But for self-referential types you DO need the tag:

```c
typedef struct tnode {
    int          value;
    struct tnode *next;     /* the struct keyword and tag are required here */
} TNode;
```

## Function pointer typedefs

This is where `typedef` is invaluable:

```c
typedef int (*Comparator)(const void *, const void *);

void sort(void *base, size_t n, size_t sz, Comparator cmp);
```

Without the typedef:

```c
void sort(void *base, size_t n, size_t sz, int (*cmp)(const void *, const void *));
```

The second form is much harder to read.

## Putting it together

```c:starter
#include <stdio.h>

typedef int Length;
typedef char *String;

typedef struct {
    Length x;
    Length y;
} Point;

typedef int (*BinaryOp)(int, int);

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

int apply(BinaryOp op, int a, int b) {
    return op(a, b);
}

int main(void) {
    String greeting = "hello";
    Point  origin   = {0, 0};
    printf("%s — origin (%d, %d)\n", greeting, origin.x, origin.y);
    printf("3+4 via apply = %d\n", apply(add, 3, 4));
    printf("3*4 via apply = %d\n", apply(mul, 3, 4));
    return 0;
}
```

```output
hello — origin (0, 0)
3+4 via apply = 7
3*4 via apply = 12
```

## Style debates

- **Capitalised typedef names** (e.g. `Point`, `Length`) make it visually obvious that the identifier is a type. K&R uses this style.
- **`_t` suffix** (e.g. `size_t`, `int32_t`) is the POSIX convention. POSIX has reserved `_t` for itself; user code arguably shouldn't.
- **No typedef** at all is the Linux kernel style for most struct types — they prefer `struct foo` to keep the kindness explicit. Both views are defensible.

## Caveat: typedef doesn't enforce types

```c
typedef int Length;
typedef int Mass;

Length L = 5;
Mass   M = 3;
M = L;        /* compiles fine — typedef is just an alias */
```

There's no type safety. `Length` and `Mass` are both `int` — the compiler can't tell them apart. To get real type safety, wrap in a struct:

```c
typedef struct { int v; } Length;
typedef struct { int v; } Mass;
```

Now `M = L` fails to compile. The cost: you write `L.v` instead of `L`.

## Try it

1. Define `typedef unsigned char Byte;` and `typedef Byte *ByteString;`. Use them to write a hex dumper.
2. Try `typedef int Array[10];` — what does `Array a;` declare?

## Notes from the author

- The newer `<stdint.h>` header is full of useful typedefs: `int32_t`, `uint64_t`, `int_fast16_t`. Use these instead of `int`/`long` when the exact bit-width matters.
- `typedef struct { ... } Foo;` (anonymous struct, named via typedef) is the most common modern style. Tag names are only needed for self-references or forward declarations.
- `typedef` is *not* `#define`. The preprocessor doesn't know types; `typedef` is parsed by the C compiler and respects scope. Always prefer it over `#define` for type aliases.

*Click **next →** for unions.*
