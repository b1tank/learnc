---
id: 08-04-random-access-lseek
chapter: 8
label: "8.4"
title: 'Random Access — Lseek'
prev: ex-8-1
next: 08-05-example-fopen-and-getc
status: done
---

Each open descriptor carries a **file offset**: the position, in bytes from the start, where the next `read` or `write` will happen. Normally that offset just advances automatically as you read and write sequentially. `lseek(fd, offset, whence)` lets you *move it explicitly* to any position, turning a stream into a randomly-accessible array of bytes — jump to byte 1000, read; jump back to byte 0, overwrite the header. This is what makes databases, archive formats, and `lseek`-based editors possible: you don't have to read a file front-to-back.

## The offset is just a position — modeled in memory

```c:run seeking is moving a byte offset
#include <stdio.h>
#include <string.h>

/* lseek moves a descriptor's offset; the in-browser sandbox has no seekable
   file, so we model the identical idea with a buffer and an explicit pos. */
int main(void) {
    char data[] = "ABCDEFGHIJ";
    long pos;
    pos = 4;                       /* absolute: lseek(fd, 4, SEEK_SET) */
    printf("at offset %ld: %c\n", pos, data[pos]);
    pos = strlen(data) - 1;        /* from the end: lseek(fd, -1, SEEK_END) */
    printf("at offset %ld: %c\n", pos, data[pos]);
    pos = 4 + 2;                   /* relative: lseek(fd, 2, SEEK_CUR) */
    printf("at offset %ld: %c\n", pos, data[pos]);
    return 0;
}
```

```output
at offset 4: E
at offset 9: J
at offset 6: G
```

Indexing `data[pos]` here is exactly what `lseek` + `read` does to a real file: position the offset, then transfer from there. The three `whence` values map directly onto the three lines: `SEEK_SET` sets an absolute offset (byte 4 → `E`), `SEEK_END` sets it relative to end-of-file (last byte → `J`), and `SEEK_CUR` moves relative to the current position (here landing on byte 6 → `G`).

## Real lseek, and the tricks it enables

On an actual descriptor the call is `off_t newpos = lseek(fd, offset, whence);`, returning the resulting absolute offset (or -1 on error):

```c
#include <unistd.h>     /* lseek, SEEK_SET/CUR/END */

lseek(fd, 0, SEEK_SET);          /* rewind to the beginning           */
off_t size = lseek(fd, 0, SEEK_END);   /* seek to end -> returns the file SIZE */
lseek(fd, -10, SEEK_END);        /* 10 bytes before the end           */
char buf[10];
read(fd, buf, sizeof buf);       /* read resumes from the new offset  */
```

A few consequences worth knowing. The `lseek(fd, 0, SEEK_END)` trick is the standard way to **measure a file's size** without `stat`. You can seek *past* the current end and then write, which creates a **[sparse file](https://en.wikipedia.org/wiki/Sparse_file)** — the gap reads back as zero bytes but consumes no disk blocks until written, a feature filesystems exploit for huge-but-mostly-empty files like VM disk images. Crucially, **not everything is seekable**: pipes, terminals, and network sockets are *streams* with no random access, so `lseek` on them fails with `ESPIPE` — which is exactly why this lesson can't seek the browser's piped stdin and models the concept in memory instead. The stdio counterpart is [`fseek`/`ftell`](https://en.cppreference.com/w/c/io/fseek), which adds the wrinkle that it must account for the library's buffer on top of the kernel offset. The name `lseek` has the historical "l" because early Unix `seek` used a 16-bit offset; `lseek` made it `long`, and modern `off_t` is 64 bits so files can exceed 2 GB.

## Go deeper
- [`lseek(2)`](https://man7.org/linux/man-pages/man2/lseek.2.html) — offsets, `whence`, and errors
- [`fseek` / `ftell`](https://en.cppreference.com/w/c/io/fseek) — the buffered stdio equivalent
- [Sparse file](https://en.wikipedia.org/wiki/Sparse_file) — seeking past end-of-file
- [Random access](https://en.wikipedia.org/wiki/Random_access) — versus sequential streams
