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

> **Source video.** [Corso di programmazione in C — appendice alla lezione sullo ZX Spectrum](https://www.youtube.com/watch?v=xaEr-XSlWfo) by Salvatore Sanfilippo.

## TL;DR

A morning-after follow-up to the Spectrum converter: a few small scoring tweaks — drop the curriculum-learning stage, reward locally-matching colors to suppress *color clashes*, add saturation boost and a "bright-only" palette mode — turn the program into something that produces genuinely impressive 1980s-quality Spectrum images. The point isn't the converter; it's how cheap a 10-minute iteration loop is when you steer the program with small, well-chosen knobs.

## Walkthrough

### Drop the curriculum, the speed makes it unnecessary `[00:00 → 01:05]`

In the previous lesson the converter learned in two phases — first the bitmap, then the colors — because mutating both at once was too hard to converge. Now that each iteration is fast, that scaffolding can go: just let it search bitmap and color attributes together, under the same Spectrum constraint that each 8×8 block has at most two colors. The convergence is comparable, often better, and the code is simpler. (Worth noting: without curriculum learning it more easily gets stuck in local minima — sometimes you just relaunch.)

### A *color-clash bonus* in the score `[01:05 → 01:44]`

The Spectrum's per-block color limit means adjacent blocks often end up with jarringly different attributes — the classic *color clash*. The fix is small: add a term to the scoring function that gives a bonus when neighboring blocks share colors. Locally this can be slightly worse than the pixel-perfect choice, but globally the image is much less noisy. The bonus is tunable (the demo pushes it up to 500 for one image) — a single number you sweep until it looks right.

### Saturation boost and palette filters `[01:47 → 02:33]`

Two more knobs added in the same session:

- **Saturation boost** on the input. The Spectrum's palette is extreme, so feeding it a faithful photograph leaves the optimizer torn between black-and-white and full color — visible as abrupt jumps where saturation crosses some threshold. Pre-boosting saturation pushes everything into a register the palette can actually represent.
- **Bright-only / dim-only palette**. The Spectrum has two intensity tiers; forcing the search to pick from just one keeps the output tonally coherent.

### The actual lesson `[07:01 → 08:31]`

> "It took me 10 minutes to ask for these modifications, and the human intervention is still fundamental."

The interesting bit isn't any single tweak — it's the loop. A program that the author called "marginal" in his life as a programmer got several genuinely good ideas (externalize the palette, penalize attribute changes within a block, add the clash bonus) in one short morning session, because each idea was *cheap to try*. That's the part to internalize: when iteration is fast, exploratory ideas you'd otherwise skip become worth pursuing.

## Try it

1. Pick any small program you've written that produces output you can *see* (a renderer, a formatter, a parser dump). Add one tunable parameter to its scoring or formatting logic and sweep it across a few values. Does the right value depend on the input?
2. List three "I wouldn't bother" improvements to that program. Estimate, for each, whether a 10-minute LLM-assisted iteration would actually change the math.

## Go deeper

- [Lesson 35 — ZX Spectrum image converter, part 2](35-zx-spectrum-image-2.md) — the program these tweaks are applied to.
- The ZX Spectrum attribute clash, explained with examples: <https://en.wikipedia.org/wiki/ZX_Spectrum_graphic_modes#Attribute_clash>.
- TAP file format (what the converter would output to load on a real Spectrum): <https://faqwiki.zxnet.co.uk/wiki/TAP_format>.

*Click **next →** for an introduction to 3D graphics fundamentals.*
