---
id: 22-system-calls
chapter: 8
label: "8.3"
title: System calls
prev: 21-opaque-types-and-files
next: 23-libc-buffering-and-mmap
status: draft
source:
  videoId: QWLJ7CBAu_I
  url: https://www.youtube.com/watch?v=QWLJ7CBAu_I
---

> **Source video.** [Impariamo il C — episodio 19: le system call](https://www.youtube.com/watch?v=QWLJ7CBAu_I) by Salvatore Sanfilippo.

## TL;DR

A **system call** is the request a user-space program makes to the kernel for a service it can't perform itself — opening a file, reading bytes off a disk, writing to a socket. Libc's `fopen`/`fread`/`fwrite`/`fclose` are thin wrappers over the POSIX system calls `open`, `read`, `write`, `close`. At the lower layer you trade buffered `FILE *` streams for raw integer file descriptors, short counts, and `errno`.

## Walkthrough

### Why POSIX exists `[01:34 → 03:21]`

Solaris, macOS, and Linux are all Unixes — three vendors, three kernels, but one **standard system-call surface** thanks to POSIX. That standardisation is why a large program like Redis is mostly portable across them: the architecture-specific code is tiny. Non-portable APIs (audio, advanced multiplexing like `epoll`/`kqueue`) live outside POSIX.

### Why a `FILE *` lives in user space and a file doesn't `[04:44 → 07:11]`

A C process is sealed inside its own address space — a Turing machine that only reads and writes its own memory. Files live *outside* that capsule, on devices the process can't touch. The kernel mediates: when you ask it to `open` a file, it allocates the bookkeeping in kernel space and hands back an **integer** — the *file descriptor* — that both sides then use to refer to that file. The integer is the entire interface between the two worlds.

### `open()` and the flag word `[08:48 → 11:42]`

`open()` lives in `<fcntl.h>` and returns an `int`:

- The first argument is the path.
- The second is a flag word: exactly one of `O_RDONLY`, `O_WRONLY`, `O_RDWR`, OR-ed with optional modifiers like `O_CREAT`, `O_APPEND`, `O_TRUNC`. (`O_CREAT` requires a third argument: the new file's permission bits.)
- It returns the new descriptor, or **-1** on error. POSIX uses -1 as the universal failure sentinel for integer-returning calls — no real descriptor is ever negative.

### `read()`, `write()`, and short counts `[17:12 → 19:03]`

`read(fd, buf, n)` returns `ssize_t` — signed, because **-1 means error**. The other return values:

- **0** — end of file (or the peer closed the socket).
- **A positive number ≤ n** — that many bytes were placed in `buf`. It may legitimately be *less* than `n`: the file had fewer bytes left, or the TCP socket has so far only received that much. Always loop until you get the bytes you actually need.

`write(fd, buf, n)` has the same shape and the same short-count rule.

### `errno` and `perror()` `[14:37 → 16:32]`

When a system call fails it sets the thread-local global `errno` (declared in `<errno.h>`) to a code that names the failure: `ENOENT` (no such file), `EACCES` (permission denied), and so on. `perror("opening file")` from `<stdio.h>` prints your prefix, a colon, and the human-readable translation of `errno` — the cheap, idiomatic way to report I/O errors. `close()` lives in `<unistd.h>` rather than `<fcntl.h>` because closing applies to many things that aren't files (sockets, pipes).

### Bypassing libc to write to stdout

The three fixed descriptors are 0, 1, 2 — stdin, stdout, stderr. So you can produce output without `printf` at all:

```c:run write(2) to stdout
#include <unistd.h>

int main(void) {
    write(STDOUT_FILENO, "hi\n", 3);
    return 0;
}
```

```output
hi
```

`write()` takes a raw byte count: no format string, no buffering, no `\0`-terminator convention — it sends exactly the bytes you point at. `STDOUT_FILENO` is just the constant `1` defined in `<unistd.h>`.

## Modern note

For one-file-at-a-time work, `read`/`write` are still exactly the right primitives. When you scale to thousands of concurrent connections, the loop "block in `read`, do something, block in `write`" becomes the bottleneck — which is what `select`, `poll`, `epoll` (Linux), `kqueue` (BSD/macOS), and finally `io_uring` (Linux 5.1+) exist to solve, by letting one thread drive many descriptors or submit batched I/O without trapping into the kernel for every operation.

## Under the hood (asm)

The `write(1, "hi\n", 3)` runnable above compiles to:

```asm
.LC0:
        .string "hi\n"
main:
        endbr64
        sub     rsp, 8
        mov     edx, 3                  ; arg 3: count
        mov     esi, OFFSET FLAT:.LC0   ; arg 2: buffer
        mov     edi, 1                  ; arg 1: fd = stdout
        call    write                   ; libc wrapper — NOT the syscall yet
        xor     eax, eax
        add     rsp, 8
        ret
```

Notice we `call write` like any C function — registers `edi`/`esi`/`edx` carry the args per the SysV ABI. Inside libc, `write` re-packs them into the **syscall ABI** (`rax = 1` for `__NR_write`, then `syscall`) — slightly different register set, hidden one layer deeper. `strace ./a.out` shows the syscall; `objdump -d a.out` shows the `call`. The [asm primer](00-asm-primer.md) has both register tables side-by-side.

[Open in **Compiler Explorer** →](https://godbolt.org/)

## Try it

1. Compile a tiny program and run `strace ./a.out` — every system call your binary makes scrolls past, including the dynamic linker's `openat` calls before `main` even starts.
2. Replace `STDOUT_FILENO` with `STDERR_FILENO` (`2`) and pipe stdout to `/dev/null`: `./a.out >/dev/null`. The text still appears, because stderr isn't redirected.
3. `man 2 open` — section **2** of the manual is the system-call reference. Read the ERRORS section at the bottom: it lists every `errno` value that call can produce.

## Cross-reference to K&R

[K&R § 8.2 — Low-Level I/O Read and Write](../../kr/lessons/08-02-low-level-io-read-and-write.md) covers the same `read`/`write`/descriptor model in K&R's own words — a useful side-by-side, written 40 years before this episode but unchanged in substance.

## Go deeper

- `man 2 read`, `man 2 write`, `man 2 open` — the canonical references. Prefer Linux man pages to macOS's; they're more thorough.
- `man 2 syscalls` — every Linux system call, one page.
- *The Open Group POSIX specification* (<https://pubs.opengroup.org/onlinepubs/9699919799/>) — the standard itself, free online.
- Tanenbaum, *Modern Operating Systems* — chapter 1 explains the user/kernel divide that makes system calls necessary in the first place.

*Click **next →** to see the buffering that libc adds on top of these primitives.*
