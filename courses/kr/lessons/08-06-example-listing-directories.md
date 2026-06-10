---
id: 08-06-example-listing-directories
chapter: 8
label: "8.6"
title: 'Example - Listing Directories'
prev: ex-8-4
next: ex-8-5
status: done
---

A directory is, at heart, just a special file whose contents are a list of **(name, inode-number)** entries. Listing a directory - what `ls` does - means opening it and walking those entries. Because the on-disk format differs across filesystems, you don't read directory bytes by hand; you use the portable POSIX layer `opendir`/`readdir`/`closedir` from `<dirent.h>`, and to learn each entry's *size, type, and timestamps* you call [`stat`](https://man7.org/linux/man-pages/man2/stat.2.html) on its name. This is the canonical example of building a useful tool from a few system calls.

## Modeling the result of a directory walk

```c:run formatting a directory listing
#include <stdio.h>

/* Real code gets these from readdir()+stat(); the sandbox has no filesystem,
   so we model the (name, size) entries the OS would return. */
struct entry { const char *name; long size; };

int main(void) {
    struct entry dir[] = {
        {"main.c", 1024}, {"main.o", 2048}, {"a.out", 16384}, {"README", 240}
    };
    int n = sizeof dir / sizeof dir[0];
    long total = 0;
    for (int i = 0; i < n; i++) {
        printf("%-10s %6ld\n", dir[i].name, dir[i].size);   /* left name, right size */
        total += dir[i].size;
    }
    printf("%-10s %6ld\n", "(total)", total);
    return 0;
}
```

```output
main.c       1024
main.o       2048
a.out       16384
README        240
(total)     19696
```

The formatting mirrors `ls -l`: `%-10s` left-justifies each name in a 10-wide column, `%6ld` right-justifies the size in a 6-wide column so the digits line up. The data here is hardcoded only because this browser sandbox has no filesystem to walk - but the *shape* of the program (iterate entries, query each one's size, accumulate a total) is exactly what a real directory lister does.

## The real opendir / readdir / stat loop

On any Unix system the genuine version is this:

```c
#include <stdio.h>
#include <dirent.h>     /* opendir, readdir, closedir, struct dirent */
#include <sys/stat.h>   /* stat, struct stat                         */

DIR *dp = opendir(".");                  /* open the directory          */
if (dp == NULL) { perror("."); return 1; }

struct dirent *e;
while ((e = readdir(dp)) != NULL) {      /* one entry per call, NULL at end */
    if (e->d_name[0] == '.') continue;   /* skip "." , ".." and dotfiles */
    struct stat st;
    if (stat(e->d_name, &st) == 0)       /* fetch metadata by name      */
        printf("%-10s %6lld\n", e->d_name, (long long) st.st_size);
}
closedir(dp);
```

Three calls do the work. `opendir` returns a `DIR *` handle (a buffered wrapper much like `FILE *`). `readdir` returns a `struct dirent *` for the next entry - crucially it gives you only the **name** and inode number, *not* the size or type, because those live in the file's inode, not the directory entry. So to get size, permissions, modification time, or whether something is itself a directory, you call `stat(name, &st)`, which fills a `struct stat` from the inode; you then inspect fields like `st.st_size`, `st.st_mode` (test with `S_ISDIR(st.st_mode)`), and `st.st_mtime`. To recurse into subdirectories - the basis of `find`, `du`, and `ls -R` - you check `S_ISDIR`, build the child path, and call yourself on it (watching for the `.` and `..` entries, which would otherwise loop forever). Two refinements real tools use: `lstat` instead of `stat` to avoid following symbolic links (so you don't recurse into a link that points back up the tree), and `fstatat`/`openat` with directory descriptors to avoid race conditions and repeated path lookups. The big idea is that the filesystem is a tree you traverse with a tiny, uniform API - names from `readdir`, metadata from `stat` - and almost every file-management utility is a variation on this loop.

## Go deeper
- [`opendir` / `readdir`](https://man7.org/linux/man-pages/man3/readdir.3.html) - walking directory entries
- [`stat(2)`](https://man7.org/linux/man-pages/man2/stat.2.html) - the metadata behind each name
- [Directory (computing)](https://en.wikipedia.org/wiki/Directory_(computing)) - name-to-inode mappings
- [`nftw` / `fts`](https://man7.org/linux/man-pages/man3/nftw.3.html) - library helpers for recursive walks
