---
id: 08-04-random-access-lseek
chapter: 8
label: "8.4"
title: 'Random Access — Lseek'
prev: 08-03-open-creat-close-unlink
next: 08-05-example-fopen-and-getc
status: done
---

Each open file maintains a **file offset** — the position from which the next `read` or `write` happens. After 100 bytes of `read`, the offset is 100; the next `read` starts there.

To move the offset around, use `lseek`:

```c
off_t lseek(int fd, off_t offset, int whence);
```

`whence` controls the meaning of `offset`:

| Value     | Reference point         |
|-----------|-------------------------|
| `SEEK_SET`| from beginning of file  |
| `SEEK_CUR`| from current position   |
| `SEEK_END`| from end of file        |

```c
lseek(fd, 0, SEEK_SET);    /* go to start */
lseek(fd, 0, SEEK_END);    /* go to end (returns file size!) */
lseek(fd, -1, SEEK_END);   /* one byte before end */
lseek(fd, 10, SEEK_CUR);   /* skip forward 10 */
```

Returns the new offset, or -1 on error.

## Get file size for free

```c
off_t size = lseek(fd, 0, SEEK_END);
lseek(fd, 0, SEEK_SET);     /* rewind */
```

You now know the size and the offset is back at the start. This is the lazy way; for "right" filesize lookup use `fstat`.

## A random-access reader

```c:starter
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>

/* read `n` bytes starting at `offset` */
static int read_at(int fd, off_t offset, void *buf, size_t n) {
    if (lseek(fd, offset, SEEK_SET) < 0) return -1;
    ssize_t got = read(fd, buf, n);
    return (int)got;
}

int main(int argc, char *argv[]) {
    int fd = open(argc > 1 ? argv[1] : "/etc/hostname", O_RDONLY);
    if (fd < 0) { perror("open"); return 1; }

    off_t size = lseek(fd, 0, SEEK_END);
    printf("file size = %lld\n", (long long)size);

    char head[64], tail[64];
    int hn = read_at(fd, 0, head, sizeof head);
    int tn = read_at(fd, size - 32 > 0 ? size - 32 : 0,
                     tail, size > 32 ? 32 : size);
    printf("head (%d): ", hn); fwrite(head, 1, hn, stdout);
    printf("\ntail (%d): ", tn); fwrite(tail, 1, tn, stdout);
    putchar('\n');
    close(fd);
    return 0;
}
```

```output
file size = 13
head (13): yummy.local
tail (13): yummy.local
```

(Output depends on `/etc/hostname` contents.)

## Sparse files

You can `lseek` past the end of a file and `write`. The kernel fills the "hole" with zeros without actually allocating disk for it:

```c
lseek(fd, 1024 * 1024, SEEK_SET);   /* 1 MiB into a tiny file */
write(fd, "X", 1);
/* file is now 1 MiB + 1 bytes, but on disk it uses ~one block */
```

Read the hole and you get zeros. `du` (disk usage) shows the actual blocks; `ls -l` shows the apparent size.

Sparse files are how virtual disk images, BitTorrent partial files, and many databases keep on-disk size manageable.

## `pread` / `pwrite`

Two variants do "seek + read" / "seek + write" atomically and don't change the file offset:

```c
ssize_t pread (int fd, void *buf, size_t n, off_t offset);
ssize_t pwrite(int fd, const void *buf, size_t n, off_t offset);
```

These are thread-safe for the same fd: multiple threads can `pread` different offsets without races. Plain `lseek` + `read` would interleave.

## Try it

1. Make a 100-MB sparse file. Check `du` vs `ls -l`.
2. Use `pread` to read the last 1 KB of a file without changing the offset.
3. Build a "random byte selector": open a file, generate random offsets, read one byte at each.

## Notes from the author

- `lseek`'s return value (the new offset) is rarely used; people read or ignore it. Don't forget to error-check (`< 0`).
- `off_t` is typically 64-bit on modern systems (`-D_FILE_OFFSET_BITS=64` on 32-bit systems makes it so). Use it; don't assume 32-bit offsets.
- For sequential reads, `lseek` is rarely needed — the offset advances automatically. `lseek` is for random access: databases, archives, hex editors, BitTorrent.

*Click **next →** for fopen reimplemented.*
