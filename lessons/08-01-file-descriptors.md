---
id: 08-01-file-descriptors
chapter: 8
label: "8.1"
title: 'File Descriptors'
prev: ex-7-9
next: 08-02-low-level-io-read-and-write
status: done
---

Beneath the buffered `FILE *` streams of chapter 7 lies the operating system's *real* I/O interface: the **file descriptor**, a small non-negative integer the kernel hands you when you open something. Every open file, pipe, socket, or device a process holds is identified by one of these integers, which index into a per-process table the kernel maintains. The three you always start with are fixed by convention: **0 = standard input, 1 = standard output, 2 = standard error**. The functions in this chapter — `read`, `write`, `open`, `close`, `lseek` — are thin wrappers over **system calls** that speak directly in descriptors, with no buffering or formatting in between.

## Talking to the kernel by number

```c:run read from fd 0, write to fd 1
#include <unistd.h>
#include <string.h>

int main(void) {
    char buf[256];
    const char *p = "fd 1 is stdout; fd 2 is stderr\n";
    write(STDOUT_FILENO, p, strlen(p));            /* fd 1, no printf */
    int n = read(STDIN_FILENO, buf, sizeof buf);   /* fd 0 */
    write(STDOUT_FILENO, "echo: ", 6);
    if (n > 0) write(STDOUT_FILENO, buf, n);
    return 0;
}
```

```stdin
hi there
```

```output
fd 1 is stdout; fd 2 is stderr
echo: hi there
```

No `<stdio.h>`, no `FILE *`, no `printf` — just `read` and `write` from `<unistd.h>` operating on the bare integers `STDOUT_FILENO` (1) and `STDIN_FILENO` (0). Each `write` call is (essentially) one trip into the kernel that copies bytes straight to the destination; each `read` asks the kernel for up to `sizeof buf` bytes from the input. This is the layer the C library's streams are built on top of: `printf` ultimately calls `write(1, …)`, and `getchar` ultimately calls `read(0, …)`.

## What a descriptor really is, and why redirection works

A file descriptor is an **index into the kernel's open-file table** for your process. When you open a file you get the lowest unused number (so the first `open` after the standard three is usually 3); `close` releases it back. The descriptor points to a kernel object holding the current read/write offset, the access mode, and a link to the actual file/pipe/socket. This indirection is the secret behind Unix's elegance. **Redirection** (`prog > out.txt`) works because the shell, *before* exec-ing your program, opens `out.txt` and arranges for it to be descriptor 1 — so your unchanged `write(1, …)` lands in the file. **Pipes** (`a | b`) connect `a`'s descriptor 1 to `b`'s descriptor 0 through a kernel buffer. The system calls that make this possible — [`dup`/`dup2`](https://man7.org/linux/man-pages/man2/dup.2.html) (duplicate a descriptor onto a chosen number) and the fork/exec dance — are how shells and servers wire processes together. Because *everything is a file* in Unix (the famous design principle), the same `read`/`write` calls work uniformly on files, terminals, pipes, network sockets, and devices like `/dev/null` — one tiny, uniform interface for all I/O. A system call itself is not a normal function call: it traps into the kernel (via a `syscall`/`int 0x80` instruction), switching from user mode to privileged kernel mode to do the work, then returns — which is why syscalls are comparatively expensive and why the buffered `FILE *` layer exists to batch them.

## Go deeper
- [File descriptor](https://en.wikipedia.org/wiki/File_descriptor) — the integer and the table behind it
- [`read(2)`](https://man7.org/linux/man-pages/man2/read.2.html) / [`write(2)`](https://man7.org/linux/man-pages/man2/write.2.html) — the core syscalls
- [Everything is a file](https://en.wikipedia.org/wiki/Everything_is_a_file) — the unifying Unix idea
- [System call](https://en.wikipedia.org/wiki/System_call) — how user code enters the kernel
