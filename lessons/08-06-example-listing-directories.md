---
id: 08-06-example-listing-directories
chapter: 8
label: "8.6"
title: 'Example — Listing Directories'
prev: ex-8-4
next: ex-8-5
status: done
---

A directory in Unix is a special kind of file containing **directory entries** — pairs of `(inode number, name)`. The POSIX way to read them is the `<dirent.h>` API:

```c
#include <dirent.h>

DIR           *opendir (const char *name);
struct dirent *readdir (DIR *dirp);
int            closedir(DIR *dirp);
```

Each `readdir` returns one entry or `NULL` at the end. The struct has at least:

```c
struct dirent {
    ino_t  d_ino;     /* inode number */
    char   d_name[];  /* null-terminated filename */
    /* plus implementation-specific fields */
};
```

## A tiny `ls`

```c:starter
#include <stdio.h>
#include <dirent.h>
#include <sys/stat.h>
#include <string.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    const char *dir = (argc > 1) ? argv[1] : ".";
    DIR *d = opendir(dir);
    if (!d) { perror(dir); return 1; }

    struct dirent *de;
    while ((de = readdir(d)) != NULL) {
        if (strcmp(de->d_name, ".") == 0 || strcmp(de->d_name, "..") == 0)
            continue;

        /* build full path and stat it */
        char path[1024];
        snprintf(path, sizeof path, "%s/%s", dir, de->d_name);
        struct stat st;
        if (stat(path, &st) < 0) {
            perror(path);
            continue;
        }
        char type = '?';
        if      (S_ISREG(st.st_mode)) type = '-';
        else if (S_ISDIR(st.st_mode)) type = 'd';
        else if (S_ISLNK(st.st_mode)) type = 'l';
        else if (S_ISFIFO(st.st_mode))type = 'p';
        else if (S_ISCHR(st.st_mode)) type = 'c';
        else if (S_ISBLK(st.st_mode)) type = 'b';

        printf("%c %8lld %s\n", type, (long long)st.st_size, de->d_name);
    }
    closedir(d);
    return 0;
}
```

```output
- 1234 README.md
d   96 src
- 5678 hello.c
```

(Output depends on the directory.)

## `stat` — get info on a file

```c
struct stat {
    dev_t     st_dev;     /* device */
    ino_t     st_ino;     /* inode */
    mode_t    st_mode;    /* type + permissions */
    nlink_t   st_nlink;   /* number of hard links */
    uid_t     st_uid;     /* user ID */
    gid_t     st_gid;     /* group ID */
    off_t     st_size;    /* size in bytes */
    time_t    st_atime;   /* last access */
    time_t    st_mtime;   /* last modification */
    time_t    st_ctime;   /* last status change */
    /* ... */
};
```

`stat(path, &st)` follows symlinks; `lstat(path, &st)` does not. Use `lstat` if you want to know "is this a symlink?".

## `S_IS*` macros

The mode field encodes both file type and permission bits:

```c
S_ISREG(m)   /* regular file */
S_ISDIR(m)   /* directory */
S_ISLNK(m)   /* symlink */
S_ISFIFO(m)  /* named pipe */
S_ISCHR(m)   /* character device */
S_ISBLK(m)   /* block device */
S_ISSOCK(m)  /* socket */
```

Permission bits: `S_IRUSR | S_IWUSR | S_IXUSR | S_IRGRP | ...`. Or use the octal form (`0644`, `0755`).

## Recursive directory walks

To traverse subdirectories, recurse:

```c
void walk(const char *path) {
    struct stat st;
    if (lstat(path, &st) < 0) return;
    printf("%s\n", path);
    if (!S_ISDIR(st.st_mode)) return;

    DIR *d = opendir(path);
    if (!d) return;
    struct dirent *de;
    while ((de = readdir(d))) {
        if (strcmp(de->d_name, ".") == 0 || strcmp(de->d_name, "..") == 0)
            continue;
        char child[1024];
        snprintf(child, sizeof child, "%s/%s", path, de->d_name);
        walk(child);
    }
    closedir(d);
}
```

Beware of symlink loops! Skip symlinks or track visited inodes.

For production use, `nftw` (POSIX) does the walk with a callback. Or use `fts(3)` on BSD/Linux for richer control.

## Try it

1. Add a `-l` flag that mimics `ls -l` (mode bits, owner, mtime, size, name).
2. Sort entries alphabetically with `qsort` before printing.
3. Write a `du`-like tool that prints total size of each directory.

## Notes from the author

- The "directory is just a file" model goes back to Unix v6 (1975). Reading directories used to be done with `read(fd, buf, n)` and parsing the raw bytes. POSIX `readdir` is the portable abstraction.
- Different filesystems have different sort orders for `readdir` — alphabetic, insertion-order, whatever the filesystem feels like. **Never rely on `readdir` ordering.** Sort yourself if you need it.
- Recursive directory walks are how `find`, `du`, `tar`, `rsync`, and every backup tool work. Once you've built one, the rest is variations on the theme.

*Click **next →** for the allocator.*
