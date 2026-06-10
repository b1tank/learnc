---
id: 37-3d-graphics-basics
chapter: 9
label: "9.13"
title: Rudiments of 3D graphics
prev: 36-zx-spectrum-appendix
next: 00-asm-primer
status: draft
source:
  videoId: 4EofabMH41M
  url: https://www.youtube.com/watch?v=4EofabMH41M
---

> **Source video.** [Let's Learn C - lesson 32](https://www.youtube.com/watch?v=4EofabMH41M) by Salvatore Sanfilippo (antirez).

## TL;DR

3D rendering on a 2D screen boils down to three steps: define points in world space, project each point with `(x/z, y/z) * focal`, then connect the projected pairs with lines. The "math" is mostly one division per vertex - the rest is high-school trigonometry for rotation. With ~160 lines of C, no libraries beyond SDL for the framebuffer, you can render a rotating wireframe and watch perspective fall out of the arithmetic.

## Framebuffer setup with SDL `[01:54 → 04:14]`

`SDL_Init(SDL_INIT_VIDEO)` → `SDL_CreateWindow` → `SDL_GetWindowSurface` gives you a raw `uint8_t *pixels` buffer laid out as BGRA, with `surface->pitch` bytes per row. From there, drawing is just writing bytes - no library calls per pixel.

## The pixel() helper `[15:14 → 18:24]`

`pixel(surface, x, y, r, g, b)` bounds-checks `x`/`y` against `width`/`height`, computes the byte offset as `y * pitch + x * 4`, and writes four bytes. That single function is the entire 2D drawing API for the rest of the lesson.

## 2D rotation as a primitive `[27:53 → 30:37]`

Any point `(x, y)` on a circle can be re-emitted at angle θ with `x' = x·cos θ − y·sin θ`, `y' = x·sin θ + y·cos θ`. Salvatore derives the intuition from the unit circle - every point sits on some circle through the center, and rotating it just walks it along that circle - before stating the formula.

## Perspective in one line `[37:56 → 41:20]`

Pick a depth-dependent scale `zfactor = 1 + z/400`, then divide `x` and `y` by it. Points farther from the camera (`z > 0`) shrink toward the center; points closer (`z < 0`) widen. That's the whole projection: a single divide per vertex turns depth into the size change your eye reads as distance.

## The float gotcha `[58:21 → 59:35]`

Storing rotated coordinates in `int` quantises every angle into a grid and produces visible banding. Salvatore burns several minutes chasing this before catching it - keep coordinates in `float` until the very last cast for `pixel()`.

## Rotation around the Y axis in 3D `[01:05:39 → 01:13:48]`

`x' = x·cos α + z·sin α`, `y' = y`, `z' = −x·sin α + z·cos α`. Hook `α` to a `time` counter incremented per frame and the whole model spins. Rotate every frame from the *original* model into a separate `Rotated[]` array - never accumulate, or floating-point error drifts.

## Projecting points by hand, with the perspective divide

No SDL, no window - just project four cube corners and print their screen coordinates. This is exactly what runs inside `draw()` before any pixel is plotted. The core move is the *perspective divide*: divide each point's `x` and `y` by its depth `z`, then scale by a focal length and offset to the viewport center. Dividing by `z` is what makes equal-sized things look smaller the farther away they are.

```c:run
#include <stdio.h>

int main(void) {
    /* Four corners of the bottom face of a 2x2x2 cube,
       pushed down the +z axis so the back face is farther. */
    float verts[4][3] = {
        {-1, -1, 3},   /* front-left  */
        { 1, -1, 3},   /* front-right */
        {-1, -1, 5},   /* back-left   */
        { 1, -1, 5},   /* back-right  */
    };
    float focal = 200.0f;     /* "lens" focal length in pixels */
    int   cx = 320, cy = 240; /* viewport center (640x480)     */

    for (int i = 0; i < 4; i++) {
        float x = verts[i][0], y = verts[i][1], z = verts[i][2];
        int sx = (int)(x / z * focal) + cx;
        int sy = (int)(y / z * focal) + cy;
        printf("v%d -> (%d, %d)\n", i, sx, sy);
    }
    return 0;
}
```

```output
v0 -> (254, 174)
v1 -> (386, 174)
v2 -> (280, 200)
v3 -> (360, 200)
```

Look at the spread. The front edge (`z = 3`) spans 132 pixels (254 → 386); the back edge (`z = 5`) spans only 80 pixels (280 → 360). The same physical 2-unit-wide edge appears narrower when farther away - that is perspective, falling out of one division. Push the back vertices to `z = 10` and the back edge shrinks again, roughly halving; raise `focal` and both edges widen by the same ratio, which is a zoom, not a perspective change. Connect `v0–v1`, `v2–v3`, `v0–v2`, `v1–v3` with a line-drawing routine and you have rendered a wireframe trapezoid that *looks* like a receding floor.
