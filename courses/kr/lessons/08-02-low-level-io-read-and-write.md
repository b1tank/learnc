---
id: 08-02-low-level-io-read-and-write
chapter: 8
label: "8.2"
title: 'Low Level I/O — Read and Write'
prev: 08-01-file-descriptors
next: 08-03-open-creat-close-unlink
status: done
---

All input and output reduces to two system calls: `read` and `write`. Their signatures are symmetric — `n = read(fd, buf, count)` and `n = write(fd, buf, count)` — each transferring up to `count` bytes between your buffer and the descriptor, and each returning the number of bytes *actually* transferred (or 0 at end of input, or -1 on error). They impose **no interpretation** on the bytes: no lines, no number formatting, no buffering. They move raw memory. Everything fancier — `printf`, `fgets`, `getchar` — is library code layered on top of these two primitives.

## A raw byte-copy loop

```c:run copy stdin to stdout with read/write
#include <unistd.h>

int main(void) {
    char buf[4096];
    ssize_t n;
    long total = 0;
    while ((n = read(0, buf, sizeof buf)) > 0) {  /* until EOF (0) or error (-1) */
        write(1, buf, n);                         /* write back EXACTLY n bytes */
        total += n;
    }
    /* report the count using only write() — no stdio */
    char msg[64]; int len = 0;
    const char *pre = "[copied ";
    while (pre[len]) { msg[len] = pre[len]; len++; }
    char digits[20]; int d = 0; long t = total;
    if (t == 0) digits[d++] = '0';
    while (t) { digits[d++] = '0' + t % 10; t /= 10; }
    while (d) msg[len++] = digits[--d];
    const char *post = " bytes]\n";
    int j = 0; while (post[j]) msg[len++] = post[j++];
    write(1, msg, len);
    return 0;
}
```

```stdin
abcde
```

```output
abcde
[copied 6 bytes]
```

The idiom `while ((n = read(...)) > 0) write(fd, buf, n);` is the canonical low-level copy, and the heart of programs like `cat` and `cp`. Two details are non-negotiable. First, you **write exactly `n` bytes**, not `sizeof buf` — the last `read` usually returns fewer bytes than the buffer holds, and writing the whole buffer would emit stale garbage. Second, the loop stops when `read` returns 0 (clean end of input) and treats a negative return as an error. Notice we even formatted the byte count by hand with `write`, to drive home that *no `stdio` is involved here at all*.

## Buffer size, partial transfers, and the cost of syscalls

The buffer size is a pure performance dial, not a correctness one. Each `read`/`write` is a [system call](https://en.wikipedia.org/wiki/System_call) — a relatively expensive trap into the kernel — so reading one byte at a time (`read(0, &c, 1)`) makes a syscall per byte and crawls, while a 4 KB or larger buffer amortizes that cost over thousands of bytes. This is precisely *why* the buffered `FILE *` layer exists: `getchar` pulls from a library buffer that was filled by one big `read`, turning a syscall-per-character into a syscall-per-block. The other essential truth is the **partial transfer**: `read` may return fewer bytes than you asked for even when not at end-of-file (a pipe with little data, a signal interrupting it, a network socket), and `write` may accept fewer than you offered — so robust code *loops* on `write` until all `n` bytes are sent, and never assumes one call moves everything. A return of -1 sets the global `errno` (e.g. `EINTR` for an interrupted call, which you typically retry); checking it is mandatory in production code. These two calls, with their integer descriptors, are the entire foundation of Unix I/O — and they map almost one-to-one onto the kernel's internal `sys_read`/`sys_write` handlers.

## Go deeper
- [`read(2)`](https://man7.org/linux/man-pages/man2/read.2.html) / [`write(2)`](https://man7.org/linux/man-pages/man2/write.2.html) — return values and error cases
- [`<unistd.h>`](https://en.wikipedia.org/wiki/Unistd.h) — the POSIX syscall wrappers
- [Data buffer](https://en.wikipedia.org/wiki/Data_buffer) — why block sizes matter
- [`errno` / `EINTR`](https://man7.org/linux/man-pages/man3/errno.3.html) — handling partial and interrupted I/O
