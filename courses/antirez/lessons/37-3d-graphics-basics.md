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

> **Source video.** [Corso di programmazione in C — lezione 32: rudimenti di grafica 3D](https://www.youtube.com/watch?v=4EofabMH41M) by Salvatore Sanfilippo.

## TL;DR

3D rendering on a 2D screen boils down to three steps: define points in world space, project each point with `(x/z, y/z) * focal`, then connect the projected pairs with lines. The "math" is mostly one division per vertex — the rest is high-school trigonometry for rotation. With ~160 lines of C, no libraries beyond SDL for the framebuffer, you can render a rotating wireframe and watch perspective fall out of the arithmetic.

## Walkthrough

- `[01:54 → 04:14]` **Framebuffer setup with SDL.** `SDL_Init(SDL_INIT_VIDEO)` → `SDL_CreateWindow` → `SDL_GetWindowSurface` gives you a raw `uint8_t *pixels` buffer laid out as BGRA, with `surface->pitch` bytes per row. From there, drawing is just writing bytes — no library calls per pixel.
- `[15:14 → 18:24]` **The `pixel(surface, x, y, r, g, b)` helper.** Bounds-check `x`/`y` against `width`/`height`, compute the byte offset as `y * pitch + x * 4`, write four bytes. That single function is the entire 2D drawing API for the rest of the lesson.
- `[27:53 → 30:37]` **2D rotation as a primitive.** Any point `(x, y)` on a circle can be re-emitted at angle θ with `x' = x·cos θ − y·sin θ`, `y' = x·sin θ + y·cos θ`. Salvatore derives the intuition from the unit circle before stating the formula.
- `[37:56 → 41:20]` **Perspective in one line.** Pick a depth-dependent scale `zfactor = 1 + z/400`, then multiply `x` and `y` by it (or, equivalently, divide). Points farther from the camera (`z > 0`) shrink toward the center; points closer (`z < 0`) widen. That's the whole projection.
- `[58:21 → 59:35]` **The `float` gotcha.** Storing rotated coordinates in `int` quantises every angle into a grid and produces visible banding. Salvatore burns several minutes chasing this before catching it — keep coordinates in `float` until the very last cast for `pixel()`.
- `[01:05:39 → 01:13:48]` **Rotation around the Y axis in 3D.** `x' = x·cos α + z·sin α`, `y' = y`, `z' = −x·sin α + z·cos α`. Hook `α` to a `time` counter incremented per frame and the whole model spins. Rotate every frame from the *original* model into a separate `Rotated[]` array — never accumulate, or floating-point error drifts.

## A self-contained projection

No SDL, no window — just project four cube corners and print their screen coordinates. This is exactly what runs inside `draw()` before any pixel is plotted.

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

Look at the spread. The front edge (`z = 3`) spans 132 pixels (254 → 386); the back edge (`z = 5`) spans only 80 pixels (280 → 360). The same physical 2-unit-wide edge appears narrower when farther away — that's perspective, falling out of one division. Connect `v0–v1`, `v2–v3`, `v0–v2`, `v1–v3` with a line-drawing routine and you've rendered a wireframe trapezoid that *looks* like a receding floor.

## Modern note

Production rendering does the same projection, only dressed up: vertices are pushed through 4×4 matrices in *homogeneous coordinates* (`(x, y, z, w)`), and the perspective divide by `w` happens automatically after a matrix multiply. The GPU rasteriser turns the projected triangles into pixels in parallel, with depth testing (the *z-buffer* Salvatore alludes to at the end) deciding which surface wins per pixel. Vulkan, Metal, WebGPU, and OpenGL all expose this same pipeline. The fundamental arithmetic hasn't changed since the 1970s — there's just a lot more silicon doing it.

## Try it

1. **Move the back edge farther.** Change `z = 5` to `z = 10` in the back two vertices. The back edge should shrink to roughly half its current width — predict the new coordinates before re-running.
2. **Change the focal length.** Set `focal = 400.0f`. Both edges widen by 2×; the perspective *ratio* stays the same. This is a zoom (longer lens), not a perspective change.
3. **Add the third dimension by hand.** Apply the Y-axis rotation `x' = x·cos α + z·sin α`, `z' = −x·sin α + z·cos α` with `α = 0.5f` to each vertex *before* projection. The four points should rotate around the world's vertical axis.

## Cross-reference to K&R

The arithmetic core of this lesson — divisions, sign-aware multiplications, mixing `int` and `float` — is exactly the territory of [K&R § 2.5 — Arithmetic Operators](../../kr/lessons/02-05-arithmetic-operators.md). The bug Salvatore hits at `[58:21]` (quantisation from storing floats in `int`s) is precisely the kind of type-conversion footgun K&R warns about in that section.

## Go deeper

- [Scratchapixel 2.0](https://www.scratchapixel.com/) — free, principled walk through ray tracing and rasterisation, starting from the same `x/z` projection Salvatore uses.
- *Computer Graphics from Scratch* by Gabriel Gambetta — short book that builds a raster renderer with no graphics libraries (free at [gabrielgambetta.com/computer-graphics-from-scratch](https://gabrielgambetta.com/computer-graphics-from-scratch/)).
- *Computer Graphics: Principles and Practice* (Hughes et al.) — the encyclopaedic reference once you want the matrix algebra, clipping, and shading models in full.
- The [original source for this lesson](https://gist.github.com/antirez/9a3dc1bc9749792fc036ab4c04669a06) — Salvatore's complete `points.c`, ~160 lines.
