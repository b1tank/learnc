---
id: 34-zx-spectrum-image-1
chapter: 9
label: "9.10"
title: Evolving an image for the ZX Spectrum (part 1)
prev: 33-toy-forth-first-program
next: 35-zx-spectrum-image-2
status: draft
source:
  videoId: D1U3uCe-kok
  url: https://www.youtube.com/watch?v=D1U3uCe-kok
---

> **Source video.** [Let's Learn C — lesson 30](https://www.youtube.com/watch?v=D1U3uCe-kok) (originally *Corso di programmazione in C — lezione 30: evolvere un'immagine per lo ZX Spectrum (parte 1)*) by Salvatore Sanfilippo.

## TL;DR

A break from Toy Forth: Salvatore walks through `zxfy`, a small C program that takes a full-colour PNG and **evolves** it into a bitmap the real ZX Spectrum can load — 256×192 pixels, with 8×8 colour-attribute blocks. The whole thing is a tiny mutate-and-keep-if-better loop (simulated annealing, in spirit) where the "fitness" is just the summed RGB distance between the candidate image and the target.

## Walkthrough

### What the program does `[01:39 → 03:35]`

Input: any PNG, resized to the Spectrum's 256×192 resolution. Output: a 6912-byte buffer that matches the Spectrum's video RAM layout exactly, so you can load it on the real hardware. The program starts from random pixels, watches the picture emerge over hundreds of thousands of generations, and previews it live in an SDL window.

### Why this is hard — the 8×8 attribute trap `[05:46 → 06:46]`

The Spectrum's screen is monochrome at the pixel level, but **each 8×8 block** gets exactly two colours: one "ink" (foreground) and one "paper" (background). You don't get to pick a colour per pixel. Any algorithm that approximates a photo has to commit to a paper/ink pair for every block *and* a bitmap that picks between them — and those two choices interact, which is what makes a naive dithering pass insufficient.

### The video-RAM layout `[12:57 → 13:24, 25:56 → 27:25]`

The 6912 bytes split into two regions:

- **6144 bytes** of bitmap (256×192 pixels packed 8 per byte) — what the ULA reads to decide *which* pixels are lit.
- **768 bytes** of attributes (32×24 blocks of one byte each, format `F B PPP III` — flash, bright, paper RGB, ink RGB) — what the ULA reads to decide *what colour* each block's lit and unlit pixels become.

The "solution" the algorithm searches over is exactly this 6912-byte buffer. A separate `zx2rgb` routine renders it into a normal RGB frame buffer so the fitness function can score it.

### The fitness function `[22:34 → 24:35]`

For every pixel pair, treat the two RGB triples as points in 3-D space and take the *squared* distance: `dR² + dG² + dB²`. Squaring kills the sign (no `abs()` needed) and is the usual Euclidean-distance trick. Sum across all 49,152 pixels, divide by the worst possible distance (`441² ≈ 195k` per pixel), and you get a single "% different" number — 0 means identical, 100 means as wrong as physically possible.

### The mutation loop `[34:53 → 41:26]`

Each generation: copy the current best buffer, flip 1–5 random bits in it, render, score. If the new score is lower — or, with probability proportional to a slowly-cooling *temperature*, even if it's slightly worse — accept it as the new best. Salvatore also sneaks in **curriculum learning**: early generations only mutate the bitmap (with fixed black/white attributes), later ones unlock the colours. It's brute force, but on a tiny image it converges in a few minutes.

## A one-byte hill climber

The whole `zxfy` algorithm collapses, on a single byte, to this:

```c:run
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    srand(0);
    int x = 0, target = 200;
    for (int i = 0; i < 2000; i++) {
        int step = (rand() & 1) ? 5 : -5;
        int nx = x + step;
        if (abs(nx - target) < abs(x - target)) x = nx;
    }
    printf("final=%d distance=%d\n", x, abs(x - target));
    return 0;
}
```

```output
final=200 distance=0
```

Start at `0`, try a random ±5 step, **keep it only if it gets us closer to 200**, repeat. With `srand(0)` the run is deterministic. Scale this up to a 6912-byte "state", swap "closer to 200" for "closer to the target PNG", and you have `zxfy`.

## Modern note

Today you'd reach for **simulated annealing**, **CMA-ES**, or a small **genetic algorithm** library — or, for image approximation specifically, gradient descent through a differentiable renderer. For the live preview, **SDL2** is still a reasonable choice; **raylib** is the friendlier modern alternative with a single-header build.

## Try it

1. Change `target = 200` to `target = 137`. The loop still converges, but the final distance is no longer 0 — why? (Hint: `137` isn't a multiple of `5`.)
2. Try `step = (rand() & 1) ? 1 : -1`. Same algorithm, finer steps — does it still finish in 2000 iterations?
3. Run two copies with `srand(1)` and `srand(2)` and compare the trajectories. The *final* answer is the same; the path isn't.

## Go deeper

- ZX Spectrum hardware overview: <https://en.wikipedia.org/wiki/ZX_Spectrum>, with the screen-memory layout that makes the bitmap and attribute regions non-contiguous.
- *Simulated annealing*: <https://en.wikipedia.org/wiki/Simulated_annealing> — the temperature/acceptance trick Salvatore mentions but mostly doesn't use.
- *Evolutionary computation* overview: <https://en.wikipedia.org/wiki/Evolutionary_computation> — where mutation-only methods sit relative to full genetic algorithms.
- Roger Alsing's *Evolution of Mona Lisa* (2008) — the canonical "evolve an image" demo, with semi-transparent polygons instead of Spectrum bytes.

*Click **next →** for part 2: curriculum learning, the real `mutate` function, and writing out the `.scr` file.*
