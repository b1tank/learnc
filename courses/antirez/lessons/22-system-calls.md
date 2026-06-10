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

> **Source video.** [Let's Learn C - episode 19](https://www.youtube.com/watch?v=QWLJ7CBAu_I) by Salvatore Sanfilippo (antirez).

## TL;DR

A **system call** is the request a user-space program makes to the kernel for a service it can't perform itself - opening a file, reading bytes off a disk, writing to a socket. Libc's `fopen`/`fread`/`fwrite`/`fclose` are thin wrappers over the POSIX system calls `open`, `read`, `write`, `close`. At the lower layer you trade buffered `FILE *` streams for raw integer file descriptors, short counts, and `errno`.

## Why POSIX exists `[01:34 → 03:21]`

Solaris, macOS, and Linux are all Unixes - three vendors, three kernels, but one **standard system-call surface** thanks to POSIX. That standardisation is why a large program like Redis is mostly portable across them: the architecture-specific code is tiny. Non-portable APIs (audio, advanced multiplexing like `epoll`/`kqueue`) live outside POSIX.

## Why a `FILE *` lives in user space and a file doesn't `[04:44 → 07:11]`

A C process is sealed inside its own address space - a Turing machine that only reads and writes its own memory. Files live *outside* that capsule, on devices the process can't touch. The kernel mediates: when you ask it to `open` a file, it allocates the bookkeeping in kernel space and hands back an **integer** - the *file descriptor* - that both sides then use to refer to that file. The integer is the entire interface between the two worlds.

## `open()` and the flag word `[08:48 → 11:42]`

`open()` lives in `<fcntl.h>` and returns an `int`:

- The first argument is the path.
- The second is a flag word: exactly one of `O_RDONLY`, `O_WRONLY`, `O_RDWR`, OR-ed with optional modifiers like `O_CREAT`, `O_APPEND`, `O_TRUNC`. (`O_CREAT` requires a third argument: the new file's permission bits.)
- It returns the new descriptor, or **-1** on error. POSIX uses -1 as the universal failure sentinel for integer-returning calls - no real descriptor is ever negative.

## `read()`, `write()`, and short counts `[17:12 → 19:03]`

`read(fd, buf, n)` returns `ssize_t` - signed, because **-1 means error**. The other return values:

- **0** - end of file (or the peer closed the socket).
- **A positive number ≤ n** - that many bytes were placed in `buf`. It may legitimately be *less* than `n`: the file had fewer bytes left, or the TCP socket has so far only received that much. Always loop until you get the bytes you actually need.

`write(fd, buf, n)` has the same shape and the same short-count rule.

## `errno` and `perror()` `[14:37 → 16:32]`

When a system call fails it sets the thread-local global `errno` (declared in `<errno.h>`) to a code that names the failure: `ENOENT` (no such file), `EACCES` (permission denied), and so on. `perror("opening file")` from `<stdio.h>` prints your prefix, a colon, and the human-readable translation of `errno` - the cheap, idiomatic way to report I/O errors. `close()` lives in `<unistd.h>` rather than `<fcntl.h>` because closing applies to many things that aren't files (sockets, pipes).

You can watch `errno` get set: print it right after a failed `open`, before you even check the return value, and `perror` then translates the same code into words.

```c
int fd = open("stdio3.c", O_RDONLY);   /* file does not exist */
printf("errno is %d\n", errno);        /* errno from <errno.h> */
if (fd == -1) { perror("Unable to open file"); return 1; }
```

```output
errno is 2
Unable to open file: No such file or directory
```

The ERRORS section of `man 2 open` lists `ENOENT` - value `2` - for a path that doesn't exist; when the file *is* there, `open` succeeds and `errno` is left at 0.

## Bypassing libc to write to stdout `[20:27 → 21:06]`

The three fixed descriptors are 0, 1, 2 - stdin, stdout, stderr. So you can produce output without `printf` at all:

```c:run write() to stdout
#include <unistd.h>

int main(void) {
    write(STDOUT_FILENO, "hi\n", 3);
    return 0;
}
```

```output
hi
```

`write()` takes a raw byte count: no format string, no buffering, no `\0`-terminator convention - it sends exactly the bytes you point at. `STDOUT_FILENO` is just the constant `1` defined in `<unistd.h>`.

## Calling the kernel directly

`write()` is still a libc function - a thin wrapper. You can drop one layer lower and ask libc to fire an arbitrary syscall by number with `syscall()` from `<sys/syscall.h>`. Here the same bytes reach stdout two ways: through the raw syscall, then through `printf`:

```c:run raw syscall vs printf
#include <unistd.h>
#include <sys/syscall.h>
#include <stdio.h>

int main(void) {
    syscall(SYS_write, 1, "raw syscall\n", 12);   /* straight to the kernel */
    printf("via printf\n");                       /* libc buffers, then write() */
    return 0;
}
```

```output
raw syscall
via printf
```

`SYS_write` is just the number `1` on x86-64 Linux. On this machine a syscall is literally one CPU instruction. Compile a raw-syscall program statically and disassemble libc's `syscall` helper:

```
gcc -O2 -static rawmin.c -o rawmin
objdump -d rawmin
```

```asm
<syscall>:
        endbr64
        mov    %rdi,%rax      ; syscall number (SYS_write = 1) -> rax
        mov    %rsi,%rdi       ; shuffle the rest into the syscall ABI registers
        mov    %rdx,%rsi
        mov    %rcx,%rdx
        mov    %r8,%r10
        mov    %r9,%r8
        mov    0x8(%rsp),%r9
        syscall                ; trap into the kernel
        ...
        ret
```

That is the whole user/kernel boundary in one picture: the number goes in `rax`, the arguments go in `rdi`/`rsi`/`rdx`/`r10`/`r8`/`r9`, and the single `syscall` instruction switches the CPU into kernel mode to run the handler for number 1. Everything `fopen`/`fread`/`printf` do eventually funnels down to a `syscall` instruction like this one.

## What strace reveals

`strace` prints every system call a process makes. Run it on the tiny `write()` program and you see far more than one call - the dynamic linker opens and maps libc before `main` even starts:

```
gcc hi.c -o hi
strace -c ./hi
```

```output
hi
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
  0.00    0.000000           0         1           read
  0.00    0.000000           0         1           write
  0.00    0.000000           0         2           close
  0.00    0.000000           0         8           mmap
  0.00    0.000000           0         4           mprotect
  0.00    0.000000           0         1           munmap
  0.00    0.000000           0         1           brk
  0.00    0.000000           0         4           pread64
  0.00    0.000000           0         1         1 access
  0.00    0.000000           0         1           execve
  0.00    0.000000           0         2         1 arch_prctl
  0.00    0.000000           0         1           set_tid_address
  0.00    0.000000           0         2           openat
  0.00    0.000000           0         2           newfstatat
  0.00    0.000000           0         1           set_robust_list
  0.00    0.000000           0         1           prlimit64
  0.00    0.000000           0         1           rseq
------ ----------- ----------- --------- --------- ----------------
100.00    0.000000           0        34         2 total
```

Your code makes exactly **one** `write`. The other 33 calls are startup machinery: `execve` launched the binary, `openat`/`read`/`mmap`/`mprotect` loaded and protected libc, and `brk`/`arch_prctl` set up the heap and thread state. Tracing a program once is the fastest way to see that "a process" is a long conversation with the kernel, not an isolated computation.
