---
id: 08-03-open-creat-close-unlink
chapter: 8
label: "8.3"
title: 'Open, Creat, Close, Unlink'
prev: 08-02-low-level-io-read-and-write
next: ex-8-1
status: done
---

`read` and `write` need a descriptor to operate on; `open` is how you *get* one for a named file. `open(path, flags, mode)` asks the kernel to open (and optionally create) a file and returns the lowest free descriptor, or -1 on failure. `close(fd)` releases a descriptor when you're done, and `unlink(path)` removes a name from the filesystem. Together with `read`/`write` these are the complete low-level file API — the exact calls the `fopen`/`fclose`/`remove` of `<stdio.h>` are built on.

## Descriptors connect FILE* to the kernel

```c:run a FILE* is a buffered wrapper over a descriptor
#include <stdio.h>

int main(void) {
    /* fileno() exposes the raw descriptor inside each standard stream. */
    printf("fileno(stdin)  = %d\n", fileno(stdin));
    printf("fileno(stdout) = %d\n", fileno(stdout));
    printf("fileno(stderr) = %d\n", fileno(stderr));
    return 0;
}
```

```output
fileno(stdin)  = 0
fileno(stdout) = 1
fileno(stderr) = 2
```

`fileno(fp)` extracts the integer descriptor buried inside a `FILE *`, making the layering explicit: `stdin` is a buffered stream wrapped around descriptor 0, `stdout` around 1, `stderr` around 2. Every `fopen` you do creates a `FILE` whose hidden field is a descriptor returned by `open`. (This in-browser sandbox has no writable filesystem, so the `open`/`creat` calls below can't *run* here — but they're the real, unchanged syscalls you'd use on any Unix system.)

## Opening, creating, and removing files

The real low-level file lifecycle looks like this:

```c
#include <fcntl.h>      /* open, O_* flags  */
#include <unistd.h>     /* read, write, close, unlink */

int fd = open("data.txt", O_RDONLY);              /* open existing for reading */
if (fd == -1) { perror("data.txt"); return 1; }   /* -1 => check errno */

/* create-or-truncate for writing, permission bits 0644 (rw-r--r--): */
int out = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
write(out, "hello\n", 6);
close(fd);
close(out);                                       /* release both descriptors */

unlink("out.txt");                                /* remove the name */
```

The **flags** argument is a bitwise-OR of an access mode plus options: exactly one of `O_RDONLY`, `O_WRONLY`, `O_RDWR`, optionally `O_CREAT` (create if absent — and only then is the third `mode` argument used), `O_TRUNC` (truncate to zero length), `O_APPEND` (always write at the end), and `O_EXCL` (with `O_CREAT`, fail if the file already exists — the basis of safe lock files). The **mode** (`0644`, an octal permission mask) sets the new file's Unix permissions, and is itself filtered by the process's [`umask`](https://man7.org/linux/man-pages/man2/umask.2.html). The old `creat(path, mode)` call is just shorthand for `open(path, O_WRONLY|O_CREAT|O_TRUNC, mode)`. **`close`** matters for two reasons: descriptors are a *limited resource* (each process has a cap, often ~1024), so leaking them eventually makes `open` fail with `EMFILE`; and on some systems buffered metadata is finalized at close. **`unlink`** reveals a subtlety of Unix filesystems: it removes a *directory entry* (a name), not necessarily the file's data. A file's bytes persist until both its last name is unlinked *and* its last open descriptor is closed — the kernel reference-counts [inodes](https://en.wikipedia.org/wiki/Inode). This is why you can `unlink` a temp file right after opening it and still read/write it through the descriptor: the data lives on, nameless, until you close, after which the kernel reclaims it — a classic idiom for self-cleaning scratch files.

## Go deeper
- [`open(2)`](https://man7.org/linux/man-pages/man2/open.2.html) — flags, modes, and return value
- [`close(2)`](https://man7.org/linux/man-pages/man2/close.2.html) / [`unlink(2)`](https://man7.org/linux/man-pages/man2/unlink.2.html) — releasing descriptors and names
- [Inode](https://en.wikipedia.org/wiki/Inode) — why unlink doesn't always delete data
- [File-system permissions](https://en.wikipedia.org/wiki/File-system_permissions) — what `0644` means
