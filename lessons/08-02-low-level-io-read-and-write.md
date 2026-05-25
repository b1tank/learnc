---
id: 08-02-low-level-io-read-and-write
chapter: 8
label: "8.2"
title: 'Low Level I/O — Read and Write'
prev: 08-01-file-descriptors
next: 08-03-open-creat-close-unlink
status: done
---

The two workhorses:

```c
ssize_t read (int fd, void *buf, size_t n);
ssize_t write(int fd, const void *buf, size_t n);
```

- **`fd`**: the open file descriptor.
- **`buf`**: where to put the data (`read`) or where to take it from (`write`).
- **`n`**: max bytes the user wants to move.
- **Return**: number of bytes actually moved, or `-1` on error (with `errno` set).
- **Return `0`** from `read`: end of file.

## The "short read/write" rule

`read` may return **less than `n`** even when there's more data:

- Reading from a terminal: returns one line at a time.
- Reading from a pipe: returns whatever the writer has flushed so far.
- Reading from a socket: returns whatever's arrived (may be one packet).
- Interrupted by a signal: returns partial result.

Same for `write` (especially on non-blocking sockets, signals, near-full pipes).

**Always handle short returns.** The standard idiom:

```c
ssize_t full_write(int fd, const void *buf, size_t n) {
    const char *p = buf;
    size_t left = n;
    while (left > 0) {
        ssize_t w = write(fd, p, left);
        if (w < 0) {
            if (errno == EINTR) continue;  /* interrupted; retry */
            return -1;
        }
        p    += w;
        left -= w;
    }
    return n;
}
```

## A minimal file copy

```c:starter
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>

int main(int argc, char *argv[]) {
    if (argc != 3) {
        fprintf(stderr, "usage: %s SRC DST\n", argv[0]);
        return 1;
    }
    int in  = open(argv[1], O_RDONLY);
    if (in < 0)  { perror(argv[1]); return 1; }
    int out = open(argv[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (out < 0) { perror(argv[2]); close(in); return 1; }

    char buf[4096];
    ssize_t n;
    while ((n = read(in, buf, sizeof buf)) > 0) {
        ssize_t off = 0;
        while (off < n) {
            ssize_t w = write(out, buf + off, n - off);
            if (w < 0 && errno == EINTR) continue;
            if (w < 0) { perror("write"); close(in); close(out); return 1; }
            off += w;
        }
    }
    if (n < 0) { perror("read"); close(in); close(out); return 1; }
    close(in);
    if (close(out) < 0) { perror("close"); return 1; }
    return 0;
}
```

```output
(awaits CLI args)
```

## Buffer size and performance

| Buffer | Throughput (approx) |
|--------|---------------------|
| 1      | very slow (one syscall per byte) |
| 128    | slow                |
| 1024   | OK                  |
| 4096   | fast — matches typical disk block |
| 65536  | fast — uses CPU cache well |
| 1MB+   | diminishing returns |

The system call overhead is roughly fixed per call. Bigger buffers mean fewer calls. **4 KiB to 64 KiB** is the practical sweet spot for sequential file I/O.

## Errors to handle

- `EINTR`: signal interrupted; retry.
- `EAGAIN`/`EWOULDBLOCK`: non-blocking fd, no data; retry later.
- `ENOSPC`: disk full on `write`.
- `EIO`: hardware error.
- `EBADF`: bad fd (use-after-close).

## Try it

1. Vary the buffer size in the copy from 1 to 65536 and time a large copy.
2. Add `O_APPEND` to the open flags and see what happens on consecutive runs.
3. Try copying from `/dev/urandom` to `/dev/null` to test raw throughput.

## Notes from the author

- `ssize_t` is the signed version of `size_t`, big enough to hold either a byte count or `-1`. Use it for `read`/`write` return values, not `int`.
- The "always loop on short reads/writes" rule is one of the highest-leverage habits in systems programming. Skipping it is the source of countless bugs in network code.
- Modern kernels have `splice`, `sendfile`, `copy_file_range` for zero-copy transfers between fds. Useful when you have lots of file-to-network or file-to-file copying.

*Click **next →** for `open` and friends.*
