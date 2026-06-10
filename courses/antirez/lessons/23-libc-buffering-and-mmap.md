---
id: 23-libc-buffering-and-mmap
chapter: 8
label: "8.4"
title: libc buffering and memory-mapped files
prev: 22-system-calls
next: 24-union-and-bitfield
status: draft
source:
  videoId: yKavhObop5I
  url: https://www.youtube.com/watch?v=yKavhObop5I
---

> **Source video.** [Let's Learn C - lesson 20](https://www.youtube.com/watch?v=yKavhObop5I) by Salvatore Sanfilippo (antirez).

## TL;DR

`stdio` doesn't talk to the kernel on every `putchar` - it accumulates bytes in a user-space buffer and flushes them on a newline (line mode), when full (block mode), or when you call `fflush`. For truly low-overhead I/O, skip the buffer entirely with `mmap`: ask the kernel to page the file into your address space and access it as plain memory through a pointer.

## Why `stdio` buffers `[05:29 → 06:36]`

A naive `printf("hello world")` *before* a long `sleep(5)` doesn't appear until the sleep returns. Surprise: `printf` didn't print anything yet. The reason is that every `write` system call is a round trip into kernel space, and that costs real cycles. `stdio` hedges by allocating a buffer for each `FILE *` and writing into *that* until it has a good reason to flush.

The trigger depends on the stream's mode:

- **Line-buffered** (typical for terminals): flush on `\n` or when the buffer fills.
- **Fully-buffered** (typical for pipes and files): flush only when the buffer fills, or on `fclose`/`exit`.
- **Unbuffered** (`stderr`): every byte goes straight through.

`printf("hello world\n")` works because the newline flushes the buffer. Without it you wait. Force the flush explicitly with `fflush(stdout)`.

## Controlling the buffer with `setvbuf` `[09:34 → 12:40]`

You can pick the mode, the buffer, and the size yourself. The runner below switches `stdout` to fully-buffered, writes a chunk, flushes, then writes another chunk that only appears at program exit:

```c:run
#include <stdio.h>

int main(void) {
    setvbuf(stdout, NULL, _IOFBF, BUFSIZ);   /* full buffering on stdout */
    fputs("first chunk... ", stdout);
    fflush(stdout);                          /* visible now */
    fputs("second chunk\n", stdout);         /* visible at process exit */
    return 0;
}
```

```output
first chunk... second chunk
```

Two `write` syscalls instead of two-per-byte. That is the entire point of `stdio`: trade a small amount of memory for far fewer kernel transitions. The same buffering speeds up *reads* - `fgets` does one big `read` and serves you one line at a time from its buffer, while a hand-rolled loop calling `read(fd, &c, 1)` per character pays the syscall cost on every byte.

## When buffering bites you `[06:01 → 11:34]`

- **Mixed `printf` and `write`** on the same fd interleaves out of order - one path goes through the buffer, the other doesn't.
- **A crash before exit** loses whatever sits in the buffer. Add `fflush(stdout)` before anything that might abort, or use `stderr` for diagnostics (it's unbuffered).
- **Pipes change the mode.** A program that's line-buffered on a terminal becomes block-buffered when its stdout is piped, which is why `./prog | grep foo` sometimes appears to hang. Force line buffering with `setvbuf(stdout, NULL, _IOLBF, 0)`.

## Watching the buffer flip a pipe's output order

The mode switch is easy to see. This program writes to stdout (buffered) and stderr (always unbuffered):

```c
#include <stdio.h>

int main(void) {
    printf("1: stdout\n");          /* buffered when not a tty */
    fprintf(stderr, "2: stderr\n"); /* stderr is unbuffered */
    printf("3: stdout\n");
    return 0;
}
```

Run it straight to the terminal and the three lines come out in source order, because stdout is line-buffered on a tty and each `\n` flushes:

```output
1: stdout
2: stderr
3: stdout
```

Now merge both streams into a pipe with `./order 2>&1 | cat`. stdout is no longer a tty, so it flips to **fully-buffered** - its two lines sit in the buffer until exit, while stderr still goes straight through:

```output
2: stderr
1: stdout
3: stdout
```

Nothing changed in the program; the kernel just gave stdout a different `isatty` answer, and `stdio` picked a different buffering mode. This is the real reason a chatty program "goes silent" when you pipe it - and why diagnostics belong on unbuffered `stderr`.

## `mmap`: skip the buffer entirely `[18:14 → 23:48]`

POSIX `mmap` asks the kernel to map a file's contents into the process's address space. After the call you have a pointer; reading the file is just reading memory. No `read`, no buffer copy, no per-call syscall overhead. A few things to internalise:

- The error sentinel is **`MAP_FAILED`**, not `NULL` - `NULL` is a legal target address, so it can't double as "failed".
- `length` and `offset` are page-aligned (4 KiB on most systems). Ask for 100 bytes and you get a whole page; bytes past the file end read as zero.
- **`MAP_PRIVATE`** gives you a copy-on-write view: writes stay in memory and never reach the file. **`MAP_SHARED`** propagates writes back, but the kernel decides when - call `msync` to force it, or let dirty pages drift out lazily.
- Pair every `mmap` with `munmap(mem, length)`.

## Reading the mapping as an array `[26:29 → 32:50]`

`open` hands back the first free descriptor - `3`, because 0/1/2 are already stdin/stdout/stderr (and it's `3` on every fresh run, since exiting closes everything). The runner below creates a small file, maps it, then indexes the returned pointer like an array - the first bytes *are* the file's first bytes:

```c:run
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>

int main(void) {
    /* Create a file so the demo is self-contained. */
    int wfd = open("greeting.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    write(wfd, "#include <stdio.h>\n", 19);
    close(wfd);

    int fd = open("greeting.txt", O_RDONLY);
    printf("file descriptor: %d\n", fd);

    char *s = mmap(NULL, 100, PROT_READ, MAP_PRIVATE, fd, 0);
    if (s == MAP_FAILED) { perror("mmap"); return 1; }

    for (int j = 0; j < 10; j++)
        printf("s[%d] = %c\n", j, s[j]);

    munmap(s, 100);
    close(fd);
    return 0;
}
```

```output
file descriptor: 3
s[0] = #
s[1] = i
s[2] = n
s[3] = c
s[4] = l
s[5] = u
s[6] = d
s[7] = e
s[8] =  
s[9] = <
```

No `read`, no buffer copy: the file's source (`#include <`...) is just memory behind a pointer. Get the flags wrong (e.g. ask for write access on a read-only descriptor) and `mmap` returns `MAP_FAILED` - the all-ones address `2^64 - 1` - and the first dereference segfaults.

## The cost model `[32:50 → 35:43]`

`read` is "copy this many bytes from the file into my buffer, now". `mmap` is "set up a translation; charge me only when I touch a page". The first access to each page triggers a **page fault**: the kernel pulls the page in, the MMU records the translation, your dereference returns. Subsequent accesses are pointer dereferences with no kernel involvement.

For workloads that scan a file once end-to-end, `read` with a decent buffer is often as fast as `mmap` because both pay the same disk bandwidth. `mmap` wins for random access, for huge files you only partially touch, and for code that benefits from treating the file as an in-memory array (think `grep` searching with a smart substring algorithm directly over the bytes).
