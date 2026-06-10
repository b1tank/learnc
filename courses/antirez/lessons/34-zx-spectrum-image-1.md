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

> **Source video.** [Let's Learn C - lesson 30](https://www.youtube.com/watch?v=D1U3uCe-kok) by Salvatore Sanfilippo (antirez).

## TL;DR

A break from Toy Forth: Salvatore walks through `zxfy`, a small C program that takes a full-colour PNG and **evolves** it into a bitmap the real ZX Spectrum can load - 256×192 pixels, with 8×8 colour-attribute blocks. The whole thing is a tiny mutate-and-keep-if-better loop (simulated annealing, in spirit) where the "fitness" is just the summed RGB distance between the candidate image and the target.

## What the program does `[01:39 → 03:35]`

Input: any PNG, resized to the Spectrum's 256×192 resolution. Output: a 6912-byte buffer that matches the Spectrum's video RAM layout exactly, so you can load it on the real hardware. The program starts from random pixels, watches the picture emerge over hundreds of thousands of generations, and previews it live in an SDL window. There is no dithering algorithm anywhere in the code - the dithered look falls out of the search.

## Why this is hard - the 8×8 attribute trap `[05:46 → 06:46]`

The Spectrum's screen is monochrome at the pixel level, but **each 8×8 block** gets exactly two colours: one "ink" (foreground) and one "paper" (background). You don't get to pick a colour per pixel. Any algorithm that approximates a photo has to commit to a paper/ink pair for every block *and* a bitmap that picks between them - and those two choices interact, which is what makes a naive dithering pass insufficient. It is the same limitation you can see as clean vertical colour seams in old Spectrum game art.

## The video-RAM layout `[12:57 → 13:24, 25:56 → 27:25]`

The 6912 bytes split into two regions:

- **6144 bytes** of bitmap (256×192 pixels packed 8 per byte) - what the ULA reads to decide *which* pixels are lit.
- **768 bytes** of attributes (32×24 blocks of one byte each, format `F B PPP III` - flash, bright, paper RGB, ink RGB) - what the ULA reads to decide *what colour* each block's lit and unlit pixels become.

The "solution" the algorithm searches over is exactly this 6912-byte buffer. A separate `zx2rgb` routine renders it into a normal RGB frame buffer so the fitness function can score it. The bitmap bytes are not even stored sequentially in video RAM - the ULA's refresh order scrambles the rows - which is why `zx2rgb` does so much bit-shuffling.

## The fitness function `[22:34 → 24:35]`

For every pixel pair, treat the two RGB triples as points in 3-D space and take the *squared* distance: `dR² + dG² + dB²`. Squaring kills the sign (no `abs()` needed) and is the usual Euclidean-distance trick. Sum across all 49,152 pixels, divide by the worst possible per-pixel distance, and you get a single "% different" number - 0 means identical, 100 means as wrong as physically possible.

The worst-case distance is the diagonal of the RGB colour cube, from `(0,0,0)` to `(255,255,255)`, which Salvatore checks live in Python:

```
python3 -c "import math; print(math.sqrt(255*255 + 255*255 + 255*255))"
```

```output
441.6729559300637
```

So the most any two pixels can differ is ~441; that **441** (rounded up to 442 in the code) is the per-pixel normaliser that turns the raw summed distance into the clean 0–100% score.

## The mutation loop `[34:53 → 41:26]`

Each generation: copy the current best buffer, flip 1–5 random bits in it, render, score. If the new score is lower - or, with probability proportional to a slowly-cooling *temperature*, even if it's slightly worse - accept it as the new best. Salvatore also sneaks in **curriculum learning**: early generations only mutate the bitmap (with fixed black/white attributes), later ones unlock the colours. It's brute force, but on a tiny image it converges in a few minutes - one run he shows reaches 6.23% difference after 1.3 million tries.

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

## Packing pixels eight to a byte

"256×192 pixels packed 8 per byte" is the bitmap half of video RAM, and it is worth making concrete: each byte holds eight monochrome pixels, most-significant bit first. Packing a row of pixels into a byte is a left-shift-and-OR loop; unpacking is the mirror image with a right shift and a mask:

```c:run
#include <stdio.h>
#include <stdint.h>

/* Pack 8 pixels (0 or 1) MSB-first into one byte, like the Spectrum bitmap. */
static uint8_t pack8(const int *px) {
    uint8_t b = 0;
    for (int i = 0; i < 8; i++) b = (b << 1) | (px[i] & 1);
    return b;
}

static void unpack8(uint8_t b, int *out) {
    for (int i = 0; i < 8; i++) out[i] = (b >> (7 - i)) & 1;
}

int main(void) {
    int row[8] = {0,1,1,0,0,1,1,0};
    uint8_t byte = pack8(row);
    printf("packed byte: 0x%02X = ", byte);
    for (int i = 7; i >= 0; i--) putchar((byte >> i) & 1 ? '1' : '0');
    putchar('\n');

    int back[8];
    unpack8(byte, back);
    printf("unpacked   : ");
    for (int i = 0; i < 8; i++) printf("%d", back[i]);
    putchar('\n');

    /* 256x192 monochrome pixels => one bit each => 6144 bytes of bitmap. */
    printf("bitmap bytes: %d\n", 256 * 192 / 8);
    return 0;
}
```

```output
packed byte: 0x66 = 01100110
unpacked   : 01100110
bitmap bytes: 6144
```

The byte `0x66` *is* the eight-pixel pattern `01100110`, and `256 * 192 / 8` is exactly the `6144` from the layout above. The attribute region is the other 768 bytes - one per 8×8 block - and the genetic search is just flipping bits in this 6912-byte buffer until `zx2rgb` of it scores low against the target.
