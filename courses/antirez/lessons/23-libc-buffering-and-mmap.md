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

> **Source video.** [Let's Learn C — lesson 20](https://www.youtube.com/watch?v=yKavhObop5I) by Salvatore Sanfilippo (antirez).

## TL;DR

`stdio` doesn't talk to the kernel on every `putchar` — it accumulates bytes in a user-space buffer and flushes them on a newline (line mode), when full (block mode), or when you call `fflush`. For truly low-overhead I/O, skip the buffer entirely with `mmap`: ask the kernel to page the file into your address space and access it as plain memory through a pointer.

## Walkthrough

### Why `stdio` buffers `[05:29 → 06:36]`

A naive `printf("hello world")` *before* a long `sleep(5)` doesn't appear until the sleep returns. Surprise: `printf` didn't print anything yet. The reason is that every `write` system call is a round trip into kernel space, and that costs real cycles. `stdio` hedges by allocating a buffer for each `FILE *` and writing into *that* until it has a good reason to flush.

The trigger depends on the stream's mode:

- **Line-buffered** (typical for terminals): flush on `\n` or when the buffer fills.
- **Fully-buffered** (typical for pipes and files): flush only when the buffer fills, or on `fclose`/`exit`.
- **Unbuffered** (`stderr`): every byte goes straight through.

`printf("hello world\n")` works because the newline flushes the buffer. Without it you wait. Force the flush explicitly with `fflush(stdout)`.

### Controlling the buffer with `setvbuf` `[09:34 → 12:40]`

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

Two `write` syscalls instead of two-per-byte. That is the entire point of `stdio`: trade a small amount of memory for far fewer kernel transitions. The same buffering speeds up *reads* — `fgets` does one big `read` and serves you one line at a time from its buffer, while a hand-rolled loop calling `read(fd, &c, 1)` per character pays the syscall cost on every byte.

### When buffering bites you `[06:01 → 11:34]`

- **Mixed `printf` and `write`** on the same fd interleaves out of order — one path goes through the buffer, the other doesn't.
- **A crash before exit** loses whatever sits in the buffer. Add `fflush(stdout)` before anything that might abort, or use `stderr` for diagnostics (it's unbuffered).
- **Pipes change the mode.** A program that's line-buffered on a terminal becomes block-buffered when its stdout is piped, which is why `./prog | grep foo` sometimes appears to hang. Force line buffering with `setvbuf(stdout, NULL, _IOLBF, 0)`.

### `mmap`: skip the buffer entirely `[18:14 → 23:48]`

POSIX `mmap` asks the kernel to map a file's contents into the process's address space. After the call you have a pointer; reading the file is just reading memory. No `read`, no buffer copy, no per-call syscall overhead:

```c
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

int fd = open("data.bin", O_RDONLY);
void *mem = mmap(NULL,            /* addr: let the kernel pick */
                 4096,            /* length in bytes */
                 PROT_READ,       /* access mode */
                 MAP_PRIVATE,     /* copy-on-write; MAP_SHARED for write-back */
                 fd, 0);          /* file descriptor and offset */
if (mem == MAP_FAILED) { /* handle error */ }

const char *s = mem;
/* s[0], s[1], ... are the first bytes of the file */
```

A few things to internalise:

- The error sentinel is **`MAP_FAILED`**, not `NULL` — `NULL` is a legal target address, so it can't double as "failed".
- `length` and `offset` are page-aligned (4 KiB on most systems). Ask for 100 bytes and you get a whole page; bytes past the file end read as zero.
- **`MAP_PRIVATE`** gives you a copy-on-write view: writes stay in memory and never reach the file. **`MAP_SHARED`** propagates writes back, but the kernel decides when — call `msync` to force it, or let dirty pages drift out lazily.
- Pair every `mmap` with `munmap(mem, length)`.

### The cost model `[32:50 → 35:43]`

`read` is "copy this many bytes from the file into my buffer, now". `mmap` is "set up a translation; charge me only when I touch a page". The first access to each page triggers a **page fault**: the kernel pulls the page in, the MMU records the translation, your dereference returns. Subsequent accesses are pointer dereferences with no kernel involvement.

For workloads that scan a file once end-to-end, `read` with a decent buffer is often as fast as `mmap` because both pay the same disk bandwidth. `mmap` wins for random access, for huge files you only partially touch, and for code that benefits from treating the file as an in-memory array (think `grep` searching with a smart substring algorithm directly over the bytes).

## Modern note

- Tell the kernel how you'll touch the mapping: `madvise(mem, len, MADV_SEQUENTIAL)` for streaming, `MADV_RANDOM` for hops, `MADV_WILLNEED` to prefetch. The equivalent for `read`-style code is `posix_fadvise`.
- `io_uring` (Linux) is the modern high-throughput alternative for pure-syscall I/O — async submission queues, fewer transitions, no `mmap` quirks. Worth knowing once you outgrow blocking `read`/`write`.
- On a `SIGBUS`-prone path (file truncated while mapped) you need a signal handler or careful `fstat` checks before touching the mapping.

## Under the hood (asm)

What does "libc adds a buffering layer" actually look like? The asm for `fopen` → `fread` → `fclose`:

```asm
main:
        endbr64
        push    rbp
        mov     esi, OFFSET FLAT:.LC0   ; "r"
        mov     edi, OFFSET FLAT:.LC1   ; "/etc/hostname"
        sub     rsp, 64                 ; 64-byte stack buffer for fread
        call    fopen                   ; ← libc function call, no syscall yet
        mov     rdi, rsp                ; buf = the 64 bytes we just reserved
        mov     edx, 64                 ; size
        mov     esi, 1                  ; nmemb stride
        mov     rbp, rax                ; save FILE*
        mov     rcx, rax                ; arg4 = FILE*
        call    fread                   ; ← libc again — open(2)/read(2) hidden inside
        mov     rdi, rbp
        call    fclose
        ...
```

The binary contains no `syscall` instruction at all — every kernel transition happens *inside* the libc functions. That's the whole abstraction this lesson is about: `FILE *` is a user-space buffer wrapped around the raw file descriptor, and the buffering decides *when* the syscalls fire. `mmap`, by contrast, makes the kernel transition happen on first dereference — as a page fault, no `call` in your asm.

[Open in **Compiler Explorer** →](https://godbolt.org/) · see the [asm primer](00-asm-primer.md) for the libc-vs-syscall ABI comparison.

## Try it

1. Remove the `fflush` from the runner above and add a deliberate `abort();` between the two `fputs` calls. Locally, observe that "first chunk..." never appears.
2. Pipe a chatty program through `cat` (`./prog | cat`) and notice the output stalls — that's stdout switching to fully-buffered mode.
3. Write a one-page `mmap` of a small text file and `printf("%c", ((char*)mem)[i])` the first 20 bytes. Then `munmap` and confirm a subsequent read segfaults.

## Cross-reference to K&R

[K&R § 8.5 — Example: fopen and getc](../../kr/lessons/08-05-example-fopen-and-getc.md) builds a miniature `stdio` from `read`/`write` — the exact layer this lesson is pulling apart. K&R doesn't cover `mmap` (it's POSIX, not ANSI C), so this lesson is where the two diverge.

## Go deeper

- `man 2 mmap`, `man 2 munmap`, `man 2 madvise` — the authoritative reference.
- `man 3 setvbuf`, `man 3 fflush` — the buffering knobs.
- W. Richard Stevens & Stephen Rago, *Advanced Programming in the UNIX Environment* — chapters 3, 5, and 14 cover this material in depth.
- Linux kernel docs on `io_uring`: <https://kernel.dk/io_uring.pdf>.

*Click **next →** for `union` and bitfields.*
