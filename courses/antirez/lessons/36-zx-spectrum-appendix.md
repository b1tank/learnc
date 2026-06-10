---
id: 36-zx-spectrum-appendix
chapter: 9
label: "9.12"
title: Appendix to the ZX Spectrum lesson
prev: 35-zx-spectrum-image-2
next: 37-3d-graphics-basics
status: draft
source:
  videoId: xaEr-XSlWfo
  url: https://www.youtube.com/watch?v=xaEr-XSlWfo
---

> **Source video.** [Let's Learn C - appendix to the ZX Spectrum lesson](https://www.youtube.com/watch?v=xaEr-XSlWfo) by Salvatore Sanfilippo (antirez).

## TL;DR

A morning-after follow-up to the Spectrum converter: a few small scoring tweaks - drop the curriculum-learning stage, reward locally-matching colors to suppress *color clashes*, add saturation boost and a "bright-only" palette mode - turn the program into something that produces genuinely impressive 1980s-quality Spectrum images. The point isn't the converter; it's how cheap a 10-minute iteration loop is when you steer the program with small, well-chosen knobs.

## Drop the curriculum, the speed makes it unnecessary `[00:00 → 01:05]`

In the previous lesson the converter learned in two phases - first the bitmap, then the colors - because mutating both at once was too hard to converge. Now that each iteration is fast, that scaffolding can go: just let it search bitmap and color attributes together, under the same Spectrum constraint that each 8×8 block has at most two colors. The convergence is comparable, often better, and the code is simpler. Worth noting: without curriculum learning it more easily gets stuck in local minima - sometimes you just relaunch.

## A color-clash bonus in the score `[01:05 → 01:44]`

The Spectrum's per-block color limit means adjacent blocks often end up with jarringly different attributes - the classic *color clash*. The fix is small: add a term to the scoring function that gives a bonus when neighboring blocks share colors. Locally this can be slightly worse than the pixel-perfect choice, but globally the image is much less noisy. The bonus is tunable (the demo pushes it up to 500 for one image) - a single number you sweep until it looks right.

## Saturation boost and palette filters `[01:47 → 02:33]`

Two more knobs added in the same session:

- **Saturation boost** on the input. The Spectrum's palette is extreme, so feeding it a faithful photograph leaves the optimizer torn between black-and-white and full color - visible as abrupt jumps where saturation crosses some threshold. Pre-boosting saturation pushes everything into a register the palette can actually represent.
- **Bright-only / dim-only palette**. The Spectrum has two intensity tiers; forcing the search to pick from just one keeps the output tonally coherent.

## The actual lesson `[07:01 → 08:31]`

> "It took me 10 minutes to ask for these modifications, and the human intervention is still fundamental."

The interesting bit isn't any single tweak - it's the loop. A program that the author called "marginal" in his life as a programmer got several genuinely good ideas (externalize the palette, penalize attribute changes within a block, add the clash bonus) in one short morning session, because each idea was *cheap to try*. That's the part to internalize: when iteration is fast, exploratory ideas you'd otherwise skip become worth pursuing.

## What the clash bonus actually does to the score

The clash bonus is one number folded into the scoring function, and it changes which candidate image wins. Here is the idea boiled down to a row of four blocks, each picking one ink color. The "faithful" candidate matches the photo exactly but leaves a color clash; the "smoothed" candidate uses one flat color, so it is locally wrong but globally coherent. Lower score wins. Sweep the bonus and watch the winner flip:

```c:run
#include <stdio.h>

/* Each block picks one ink color (0..2). target[] is the per-block
   color that best matches the photo. Matching the target costs 0;
   differing costs 10 of "pixel error". A clash bonus subtracts
   `bonus` for every pair of neighbors that share a color. Lower wins. */
int score(int blocks[4], int target[4], int bonus) {
    int s = 0;
    for (int i = 0; i < 4; i++)
        if (blocks[i] != target[i]) s += 10;      /* pixel error  */
    for (int i = 0; i < 3; i++)
        if (blocks[i] == blocks[i+1]) s -= bonus;  /* neighbors agree */
    return s;
}

int main(void) {
    int target[4]   = {0, 1, 1, 2};
    int faithful[4] = {0, 1, 1, 2}; /* matches the photo exactly */
    int smoothed[4] = {1, 1, 1, 1}; /* one flat color, more coherent */

    for (int bonus = 0; bonus <= 15; bonus += 5) {
        int f = score(faithful, target, bonus);
        int s = score(smoothed, target, bonus);
        printf("bonus=%2d  faithful=%d  smoothed=%d  winner=%s\n",
               bonus, f, s, s < f ? "smoothed" : "faithful");
    }
    return 0;
}
```

```output
bonus= 0  faithful=0  smoothed=20  winner=faithful
bonus= 5  faithful=-5  smoothed=5  winner=faithful
bonus=10  faithful=-10  smoothed=-10  winner=faithful
bonus=15  faithful=-15  smoothed=-25  winner=smoothed
```

At `bonus=0` the converter just minimizes pixel error and picks the faithful image, clash and all. As the bonus grows, the coherent image's three matching neighbor pairs earn enough credit to overcome its 20 points of pixel error, and at `bonus=15` it wins. The real converter has thousands of blocks and a much richer score, but the mechanism is exactly this: one tunable number trading local accuracy for global smoothness, swept by hand until the picture looks right.
