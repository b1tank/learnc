---
id: 09-game-of-life
chapter: 4
label: "4.1"
title: Implementing Conway's Game of Life
prev: 08-while-for-switch
next: 10-pointers-intro
status: draft
source:
  videoId: c5atNuYdKK8
  url: https://www.youtube.com/watch?v=c5atNuYdKK8
---

> **Source video.** [Let's Learn C - lesson 8](https://www.youtube.com/watch?v=c5atNuYdKK8) by Salvatore Sanfilippo (antirez).

## TL;DR

A project lesson: no new syntax, just everything from lessons 1–7 wired together to simulate Conway's Game of Life. The real point is *layered abstraction in C* - the first half of the program teaches the language about your problem (board, cells, neighbours), and only then does the game logic itself become short and obvious.

## Flat `char` array as the board `[10:48 → 13:57]`

No structs, no 2-D arrays - just a 1-D buffer of `char`, sized by `#define`s, with two more for the live/dead glyphs:

```c
#define GRID_COLS 25
#define GRID_ROWS 25
#define GRID_CELLS (GRID_COLS * GRID_ROWS)   /* parentheses matter */
#define ALIVE '*'
#define DEAD  '.'
char grid[GRID_CELLS];
```

The parentheses aren't cosmetic: `#define` is *textual substitution*, so `GRID_CELLS / 2` would silently expand to `GRID_COLS * GRID_ROWS / 2` and only do what you meant by accident. `[35:01 → 35:48]`

A `char` is the right cell type because the board is only ever two symbols, `'*'` and `'.'`, and a `char` *is* a one-byte integer that happens to print as a glyph.

## Setter, getter, and 2-D-to-1-D indexing `[14:03 → 17:39]`

The array is passed by reference - a pointer to its first byte - so mutations survive after the helper returns. The index formula is the usual `y * COLS + x`:

```c
void set_cell(char *grid, int x, int y, char state) {
    grid[y * GRID_COLS + x] = state;
}
char get_cell(char *grid, int x, int y) {
    return grid[y * GRID_COLS + x];
}
```

Pointers come in lesson 10; for now, read `char *grid` as "the same `grid` from `main`, not a copy". Because the helper holds the array's address rather than a snapshot, `set_cell(grid, 10, 10, ALIVE)` is still visible back in `main` after the call returns.

## Wrap-around hidden in one helper `[18:40 → 27:01]`

A glider that walks off the right edge should reappear on the left. Both setter and getter route the coordinate through a single `cell_to_offset(x, y)`. Positive overflow is one modulo; the negative case is normalised by flipping sign, taking modulo, then mirroring back:

```c
int cell_to_offset(int x, int y) {
    if (x >= GRID_COLS) x = x % GRID_COLS;
    if (y >= GRID_ROWS) y = y % GRID_ROWS;
    if (x < 0) { x = -x % GRID_COLS; x = GRID_COLS - x; }
    if (y < 0) { y = -y % GRID_ROWS; y = GRID_ROWS - y; }
    return y * GRID_COLS + x;
}
```

Salvatore checks the negative branch by hand: for `x = -28`, `-x` is `28`, `28 % 25` is `3`, and `25 - 3` is `22` - the correct wrapped column. Get that one function right, and every layer above "lives on income" - `count_living_neighbors` never thinks about edges again. `[43:48 → 44:13]`

## Two buffers, then five-line rules `[34:45 → 49:20]`

You can't update in place: rewriting cell *(x, y)* would corrupt the neighbours that *(x+1, y)* still needs. So `old_grid` and `new_grid` - read from one, write to the other, swap each tick. Once `count_living_neighbors` exists (just a double `for` from `-1..1` skipping `(0,0)`), the rules read almost like Wikipedia:

```c
char next = DEAD;
int n = count_living_neighbors(old_grid, x, y);
if (get_cell(old_grid, x, y) == ALIVE) {
    if (n == 2 || n == 3) next = ALIVE;
} else if (n == 3)        next = ALIVE;
set_cell(new_grid, x, y, next);
```

To animate, the main loop prepends the VT100 clear-screen escape `"\x1b[2J\x1b[H"`, prints the grid, computes the next state, and `sleep(1)`s. Drop a glider at `(10,10)` and watch it slide across the terminal - and, thanks to `cell_to_offset`, wrap around the far edge instead of dying there. `[51:03 → 52:16]`

## Where the clear-screen escape comes from `[38:16 → 38:53]`

That `"\x1b[2J\x1b[H"` isn't memorised - Salvatore recovers it by piping the `clear` command through `xxd` to read the raw bytes it emits:

```
clear | xxd
```

```output
00000000: 1b5b 481b 5b32 4a1b 5b33 4a              .[H.[2J.[3J
```

`1b` is the ESC byte (`\x1b`); `[H` homes the cursor, `[2J` clears the screen, and `[3J` clears the scrollback. Copy the two you need into a `printf` and the terminal becomes a tiny canvas.

## How a 2-D grid lives in a 1-D array

The whole board is one contiguous run of bytes; "rows" and "columns" exist only in the arithmetic `y * COLS + x`. Row `y` starts at offset `y * COLS`, and adding `x` steps along that row. So the grid is stored *row-major*: all of row 0, then all of row 1, and so on. Here is the mapping made visible - a 5x3 board with one cell set through the formula, then rendered back as a 2-D picture:

```c:run layout.c
#include <stdio.h>

#define W 5
#define H 3
#define ALIVE '*'
#define DEAD  '.'

char grid[W * H];

int main(void) {
    for (int i = 0; i < W * H; i++) grid[i] = DEAD;

    int x = 3, y = 2;
    grid[y * W + x] = ALIVE;            /* one cell via the 2-D -> 1-D formula */
    printf("cell (%d,%d) -> offset %d\n", x, y, y * W + x);

    for (int row = 0; row < H; row++) {
        for (int col = 0; col < W; col++)
            printf("%c", grid[row * W + col]);
        printf("\n");
    }
    return 0;
}
```

```output
cell (3,2) -> offset 13
.....
.....
...*.
```

`(3, 2)` lands at `2 * 5 + 3 = 13`, the fourth byte of the third row. This is exactly the layout the compiler would pick for a real `char board[H][W]` - the 2-D syntax is sugar over the same `y * W + x` you can write by hand.

## Counting neighbours: bounds-check vs wrap

The full simulator is too big to embed, but `count_living_neighbors` *is* its heart, and it shows the canonical eight-neighbour scan: a double loop over offsets `-1..1`, skipping `(0,0)` so a cell never counts itself. Below, a 3x3 board with the centre `(1,1)` surrounded by four live cells:

```c:run neighbours.c
#include <stdio.h>

#define COLS 3
#define ROWS 3
#define ALIVE '*'

char board[ROWS * COLS] = { '.','*','.',  '*','.','*',  '.','.','*' };

int count_neighbors(char *g, int x, int y) {
    int n = 0;
    for (int dy = -1; dy <= 1; dy++)
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            int nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            if (g[ny * COLS + nx] == ALIVE) n++;
        }
    return n;
}

int main(void) {
    printf("%d\n", count_neighbors(board, 1, 1));
    return 0;
}
```

```output
4
```

This version *bounds-checks* and skips off-board neighbours; Salvatore's version instead routes every coordinate through `cell_to_offset`, so an off-board `nx` wraps to the opposite edge rather than being dropped. Either way the loop shape is identical: flat `char` array, `y * COLS + x` indexing, the `-1..1` double scan. Pick bounds-checking for a finite board, wrapping for a toroidal one.
