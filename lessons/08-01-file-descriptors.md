---
id: 08-01-file-descriptors
chapter: 8
label: "8.1"
title: 'File Descriptors'
prev: ex-7-9
next: 08-02-low-level-io-read-and-write
status: done
---

Chapter 8 drops below the stdio library and talks to the operating system directly. The currency at this level is the **file descriptor** — a small non-negative integer that names an open file.

```c
int fd = open("data.txt", O_RDONLY);
/* fd is 3, 4, or whatever the kernel handed back */
```

Three descriptors are always open when your program starts:

| fd | Name      | Default                       |
|----|-----------|-------------------------------|
| 0  | stdin     | terminal input                 |
| 1  | stdout    | terminal output                |
| 2  | stderr    | terminal error output          |

That's literally how `stdin`/`stdout`/`stderr` map to the OS: the C runtime wraps fd 0/1/2 in `FILE *` structs.

## Where descriptors come from

Three sources:

1. **Inherited** — the shell or parent process opens fd 0/1/2 (and any others passed via `dup`/`fork`).
2. **`open(path, flags)`** — returns a new fd for a file.
3. **`pipe(fds)`**, **`socket(...)`**, **`accept(...)`** — return fds for IPC and network.

In all cases, the fd is an index into a per-process table the kernel maintains. Behind the fd is everything the kernel knows about the open file: position, mode, type, etc.

## File-descriptor properties

- **Per-process**: `fd = 3` in your program is a totally different file from `fd = 3` in another process.
- **Small integers**: typically 0 to 1023 by default; raise with `ulimit -n`.
- **Inheritable**: `fork()` copies the fd table to the child. `exec()` keeps them (unless `O_CLOEXEC` is set).
- **Numbered lowest-first**: `open` returns the lowest unused fd. That's why closing fd 0 then `open`ing assigns fd 0 — the trick behind shell redirection.

## stdio vs. low-level I/O

Both ways are valid, but understand the layers:

```
User code
  │
  ├── fopen/fread/fwrite/printf   ←─ buffered, in libc
  │       │
  │       ▼
  ├── open/read/write/lseek/close  ←─ system calls, this chapter
  │       │
  │       ▼
  └── kernel
```

`fopen` calls `open` internally. `fread` calls `read` (often once for a big buffer, then satisfies many `fread`s from the buffer). `printf` eventually calls `write`.

When to skip stdio:

- You need exact byte counts and offsets.
- You need `O_DIRECT`, `O_APPEND`, file locks, or other Unix-specific flags.
- You're using `select`/`poll`/`epoll` on a non-file fd (socket, pipe).
- Performance — stdio's buffering can be the wrong layer for some workloads.

## A trivial example

```c:starter
#include <unistd.h>
#include <stdio.h>

int main(void) {
    /* write to stdout (fd 1) directly — no stdio */
    const char *msg = "hello via write()\n";
    write(1, msg, 18);
    /* and stderr (fd 2) */
    write(2, "this goes to stderr\n", 20);
    return 0;
}
```

```output
hello via write()
this goes to stderr
```

The output appears immediately — no buffering between you and the kernel. That's both the benefit and the cost of low-level I/O.

## Try it

1. Print "hello\n" using `write(1, ...)` and the same message using `printf`. Compile and run; both should work.
2. Run with `./prog > out.txt 2> err.txt` to see fds 1 and 2 split.
3. Use `dup2(2, 1)` to redirect stdout to stderr inside the program; verify everything goes to the err stream.

## Notes from the author

- "Everything is a file" is Unix's defining metaphor: regular files, devices, sockets, pipes, even some kernel structures all use the file-descriptor interface. Once you know `read`/`write`/`close`, you can talk to any of them.
- Other OSes use different abstractions — Windows has HANDLE (pointer-sized), separate from "file descriptor" emulation. POSIX-on-Windows (Cygwin, WSL) papers over the difference.
- File descriptors are the building block for everything more complex: pipelines, network servers, IPC. A small integer that names "an open thing" is the entire interface.

*Click **next →** for read and write.*
