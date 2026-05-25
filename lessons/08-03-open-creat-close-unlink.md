---
id: 08-03-open-creat-close-unlink
chapter: 8
label: "8.3"
title: 'Open, Creat, Close, Unlink'
prev: 08-02-low-level-io-read-and-write
next: ex-8-1
status: done
---

Four primitives let you manage the lifetime of files at the OS level:

```c
int open  (const char *path, int flags, ... /* mode_t */);
int creat (const char *path, mode_t mode);   /* historical; same as open with O_WRONLY|O_CREAT|O_TRUNC */
int close (int fd);
int unlink(const char *path);
```

## `open` flags

The `flags` argument is a bitwise-OR of:

- **Access mode** (exactly one):
  - `O_RDONLY` — read-only.
  - `O_WRONLY` — write-only.
  - `O_RDWR` — both.
- **Creation flags**:
  - `O_CREAT` — create if missing. Requires the third `mode` arg.
  - `O_EXCL` — paired with `O_CREAT`: fail if file exists.
  - `O_TRUNC` — truncate to zero length on open.
  - `O_APPEND` — every `write` goes to end-of-file (atomic on most kernels).
- **Other**:
  - `O_NONBLOCK` — don't block on slow operations.
  - `O_CLOEXEC` — auto-close on `exec()`.
  - `O_SYNC`, `O_DSYNC` — bypass buffering, force durable writes.

```c
int fd = open("data.bin", O_WRONLY | O_CREAT | O_TRUNC, 0644);
```

The `0644` is the **file mode** — what permissions to set if the file is created. `0644` is `rw-r--r--`. The actual permissions are `mode & ~umask` (your shell's umask filters out bits).

## `creat`

```c
int fd = creat("file.txt", 0644);
```

Equivalent to `open("file.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644)`. K&R era; modern code uses the `open` form.

## `close`

```c
close(fd);
```

Returns 0 on success, -1 on error (rare — usually means the descriptor was already invalid, but `close` can also surface deferred write errors).

Forgetting to `close` leaks descriptors. Long-running programs hit `EMFILE: too many open files` and fail to accept new connections.

## `unlink`

```c
unlink("temp.txt");
```

Removes the **directory entry** for the file. If no other links and no open descriptors hold it, the data is freed. While a fd is open, the file persists even after `unlink` — useful for "anonymous temporary files":

```c
int fd = open("tmpfile", O_RDWR | O_CREAT | O_TRUNC, 0600);
unlink("tmpfile");      /* gone from directory; only THIS fd can reach it */
/* use fd freely; when closed, the data is freed */
close(fd);
```

This is the basis for `tmpfile(3)` and many tempfile schemes — the file exists "in space" but has no name on disk.

## Putting it together: atomic file replace

```c:starter
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <errno.h>

static int write_atomic(const char *path, const char *data, size_t n) {
    char tmp[256];
    snprintf(tmp, sizeof tmp, "%s.tmp", path);

    int fd = open(tmp, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) { perror("open"); return -1; }
    if (write(fd, data, n) != (ssize_t)n) { perror("write"); close(fd); unlink(tmp); return -1; }
    if (close(fd) < 0) { perror("close"); unlink(tmp); return -1; }
    if (rename(tmp, path) < 0) { perror("rename"); unlink(tmp); return -1; }
    return 0;
}

int main(void) {
    const char *data = "hello, world\n";
    if (write_atomic("hello.txt", data, strlen(data)) == 0)
        printf("wrote hello.txt atomically\n");
    return 0;
}
```

```output
wrote hello.txt atomically
```

`rename` is atomic on the same filesystem — either the new file is in place or the old one is. The "write to `.tmp`, then `rename`" pattern is how nearly every config file editor saves safely.

## Try it

1. Open a file with `O_EXCL` and try to create it twice; observe `EEXIST`.
2. Open a file, `unlink` it, then try to read/write through the fd. Verify the data is still accessible.
3. Use `O_APPEND` to have two processes write to the same file simultaneously — observe interleaved-but-not-corrupted output.

## Notes from the author

- The `open` flags are essentially a small DSL — bitwise OR specifies the behaviour. Modern kernels add new flags routinely (`O_TMPFILE`, `O_PATH`, ...) — see `open(2)`.
- "Open, then unlink while still open" is the canonical anonymous-tempfile pattern. Linux has `O_TMPFILE` for the same purpose without the race window.
- The atomic-rename pattern is *also* how most editors save files. The temporary lets you commit the entire write at once; readers see either the old version or the new, never a half-written file.

*Click **next →** for random access with `lseek`.*
