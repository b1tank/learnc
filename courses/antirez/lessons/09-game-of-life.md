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

> **Source video.** [Impariamo il C — lezione 8: implementiamo Game of Life](https://www.youtube.com/watch?v=c5atNuYdKK8) by Salvatore Sanfilippo.

## TL;DR

A project lesson: no new syntax, just everything from lessons 1–7 wired together to simulate Conway's Game of Life. The real point is *layered abstraction in C* — the first half of the program teaches the language about your problem (board, cells, neighbours), and only then does the game logic itself become short and obvious.

## Walkthrough

### Flat `char` array as the board `[10:48 → 13:57]`

No structs, no 2-D arrays — just a 1-D buffer of `char`, sized by `#define`s, with two more for the live/dead glyphs:

```c
#define GRID_COLS 25
#define GRID_ROWS 25
#define GRID_CELLS (GRID_COLS * GRID_ROWS)   /* parentheses matter */
#define ALIVE '*'
#define DEAD  '.'
char grid[GRID_CELLS];
```

The parentheses aren't cosmetic: `#define` is *textual substitution*, so `GRID_CELLS / 2` would silently expand to `GRID_COLS * GRID_ROWS / 2` and only do what you meant by accident. `[35:01 → 35:48]`

### Setter, getter, and 2-D-to-1-D indexing `[14:03 → 17:39]`

The array is passed by reference — a pointer to its first byte — so mutations survive after the helper returns. The index formula is the usual `y * COLS + x`:

```c
void set_cell(char *grid, int x, int y, char state) {
    grid[y * GRID_COLS + x] = state;
}
char get_cell(char *grid, int x, int y) {
    return grid[y * GRID_COLS + x];
}
```

Pointers come in lesson 10; for now, read `char *grid` as "the same `grid` from `main`, not a copy".

### Wrap-around hidden in one helper `[18:40 → 27:01]`

A glider that walks off the right edge should reappear on the left. Both setter and getter route the coordinate through a single `cell_to_offset(x, y)`: positive overflow is `x % GRID_COLS`; negative is normalised by flipping sign, taking modulo, then mirroring back. Get that one function right, and every layer above "lives on income" — `count_living_neighbors` never thinks about edges again. `[43:48 → 44:13]`

### Two buffers, then five-line rules `[34:45 → 49:20]`

You can't update in place: rewriting cell *(x, y)* would corrupt the neighbours that *(x+1, y)* still needs. So `old_grid` and `new_grid` — read from one, write to the other, swap each tick. Once `count_living_neighbors` exists (just a double `for` from `-1..1` skipping `(0,0)`), the rules read almost like Wikipedia:

```c
char next = DEAD;
int n = count_living_neighbors(old_grid, x, y);
if (get_cell(old_grid, x, y) == ALIVE) {
    if (n == 2 || n == 3) next = ALIVE;
} else if (n == 3)        next = ALIVE;
set_cell(new_grid, x, y, next);
```

To animate, the main loop prepends the VT100 clear-screen escape `"\x1b[2J\x1b[H"`, prints the grid, computes the next state, and `sleep(1)`s. Drop a glider at `(10,10)` and watch it slide across the terminal — and, thanks to `cell_to_offset`, wrap around the far edge instead of dying there. `[51:03 → 52:16]`

### A runnable slice

The full simulator is too big to embed, but the neighbour count *is* its heart. Below, a 3×3 board with the centre `(1,1)` surrounded by four live cells:

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

Bounds-checked rather than wrapped, but the shape matches the full version: flat `char` array, `y * COLS + x` indexing, canonical `-1..1` double loop.

## Try it

1. Flip a `'.'` to `'*'` in `board` and predict the new count for `(1,1)` before re-running.
2. Apply the rules by hand: with `n = 4`, is the centre alive or dead next tick? (Live cells need 2 or 3; dead cells need exactly 3.)
3. Call `count_neighbors(board, 0, 0)`. What does the bounds check do at the corner, and how would wrap-around change the answer?

## Cross-reference to K&R

[K&R § 5.7 — Multi-dimensional Arrays](../../kr/lessons/05-07-multi-dimensional-arrays.md) is the formal version of what Salvatore does by hand here: row-major layout and `y * COLS + x` are exactly how the compiler lays out `char board[ROWS][COLS]` under the hood.

## Go deeper

- [Conway's Game of Life — Wikipedia](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) — rules, history, and a zoo of named patterns (glider, blinker, Gosper gun…).
- [John Conway, a life in games — *Quanta* tribute (2020)](https://www.quantamagazine.org/john-conway-a-life-in-games-20200428/) — short profile of the mathematician.
- [LifeWiki](https://conwaylife.com/wiki/) — community catalogue of patterns to paste in.
