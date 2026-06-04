---
id: 35-zx-spectrum-image-2
chapter: 9
label: "9.11"
title: Evolving an image for the ZX Spectrum (part 2)
prev: 34-zx-spectrum-image-1
next: 36-zx-spectrum-appendix
status: draft
source:
  videoId: fZmdsh0gQig
  url: https://www.youtube.com/watch?v=fZmdsh0gQig
---

> **Source video.** [Corso di programmazione in C — lezione 31: evolvere un'immagine per lo ZX Spectrum (parte 2 di 2)](https://www.youtube.com/watch?v=fZmdsh0gQig) by Salvatore Sanfilippo.

## TL;DR

Part 2 returns to the simulated-annealing program that fits an image into the ZX Spectrum's video memory and *optimises the optimiser*. Profiling shows `computeDiff` eats 94% of the runtime — naturally, since every 3-byte mutation re-scores 49,000 pixels. The fix is structural: mutate **one 8×8 block at a time** (unaligned to the Spectrum's attribute grid, to avoid block-edge artefacts) and score only the local **16×16 region** that the block can influence through colour attributes. Along the way the lesson shifts mode: Claude Code drives the refactor while the human stays in the role of *designer* — deciding which optimisations are worth doing, then verifying the agent actually did them.

## Walkthrough

### Curriculum learning, in one program `[10:49 → 13:11]`

The mutation loop runs in four phases gated on the generation counter: 0–200k touches only the **bitmap** half of video memory, 200k–400k freezes the bitmap and mutates **attribute bytes** while *forcing foreground ≠ background* (otherwise dark areas collapse the block to a single colour — a local minimum), 400k–600k drops the inequality constraint, and beyond 600k anything goes. Each phase narrows the search to the next-hardest sub-problem. Salvatore names the technique: **curriculum learning** — evolve aspects incrementally so the system never has to climb out of a minimum it created in an earlier phase.

### Where the time actually goes `[13:11 → 17:54]`

`sample zxfile --file zxfile_prof.txt` (the macOS sampler) collects a stack every millisecond for 10 seconds. Eyeballing the raw output gives "a lot of `computeDiff`, some `zx2rgb`, some `main`." Asking Claude Code for a tiny Python summariser turns it into hard numbers: **94.2% `computeDiff`, 4.8% `zx2rgb`.** Lesson: a sampling profiler plus a five-minute summary script tells you exactly which function to attack, and removes the temptation to "optimise the parts that feel slow."

### The 2×2 kernel is the dithering `[19:59 → 22:52]`

Why does the program produce pleasing dither at all? Because `computeDiff` doesn't compare pixel-to-pixel — it compares **2×2 patches**. Comment out the kernel and the image immediately degenerates into a hard black/white threshold. Dithering isn't a feature anyone wrote; it falls out of the loss function being slightly non-local. *This will become important in a moment, when an agent removes it by accident.*

### From global mutation to local 8×8 blocks `[22:52 → 32:51]`

Random whole-image mutation is doubly wasteful: re-scoring 49,000 pixels after touching 3, *and* the three mutations are usually in unrelated regions, so the global score barely moves. The redesign: pick one random 8×8 block per iteration, mutate only bytes inside it, score only those 64 pixels. Crucially the block is **unaligned** to the Spectrum's 32×24 attribute grid — aligning would give JPEG-style edge artefacts where neighbouring blocks disagree. An unaligned 8×8 cell overlaps **at most four** attribute bytes, which is manageable. Salvatore notes a stronger but unimplemented optimisation: cache per-pixel difference and only invalidate the changed cells — same algorithm, enormous speedup.

### Designing through, not around, the agent `[32:51 → 39:52]`

The agent's first attempt stalls at 25% loss. Two follow-ups fix it: (1) "score the **16×16** region the unaligned block falls into, not the 8×8 — that handles attribute clashes from overlapping cells fighting over shared colour bytes," and (2) "and by the way you silently dropped the 2×2 kernel — put it back." Then the closing move that makes the next session cheaper: *"write down what you learned to `CLAUDE.md`."* The agent records *sliding kernel is critical* and *expand evaluation to 16×16 to handle attribute contention* — both lessons it had to be taught. The human did no implementation; the human did all the design and all the verification.

## A tiny hill-climber that converges on a target string

Same shape as the ZX evolver, stripped to one dimension: a random string, a fitness function (Hamming distance to the target), one random mutation per generation, accept-if-not-worse. Watch the distance drop monotonically — that's the whole trick.

```c:run
#include <stdio.h>
#include <string.h>

static const char *TARGET = "HELLO ZX SPECTRUM";
static const char *ALPHA  = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
#define LEN 17
#define ASZ 27

static unsigned state = 1u;          /* portable LCG = deterministic output */
static unsigned lcg(void) {
    state = state * 1103515245u + 12345u;
    return (state >> 16) & 0x7FFFu;
}

static int hamming(const char *s) {
    int d = 0;
    for (int i = 0; i < LEN; i++) if (s[i] != TARGET[i]) d++;
    return d;
}

int main(void) {
    char cur[LEN + 1];
    for (int i = 0; i < LEN; i++) cur[i] = ALPHA[lcg() % ASZ];
    cur[LEN] = '\0';
    int best = hamming(cur);
    printf("gen %4d  d=%2d  '%s'\n", 0, best, cur);
    for (int gen = 1; gen <= 600; gen++) {
        int  pos = lcg() % LEN;
        char old = cur[pos];
        cur[pos] = ALPHA[lcg() % ASZ];
        int d = hamming(cur);
        if (d <= best) best = d;          /* accept */
        else           cur[pos] = old;    /* reject */
        if (gen % 100 == 0) printf("gen %4d  d=%2d  '%s'\n", gen, best, cur);
    }
    return 0;
}
```

```output
gen    0  d=17  'QGOSAKFULIVWLRNTF'
gen  100  d=14  'PJCMWAZV VDKURSUE'
gen  200  d=11  'EOTSM ZG FPPCGEUD'
gen  300  d= 9  'HULCI ZI CPHCSUUF'
gen  400  d= 6  'HELEO ZW TPNCCWUM'
gen  500  d= 4  'HELUO ZU SPICTSUM'
gen  600  d= 3  'HELXO ZP SPECTYUM'
```

Two design choices map straight onto the ZX program. The **accept rule** (`d <= best`) is pure hill-climbing — replace it with a probability that decays with generation and you have simulated annealing, which can escape small minima. The **local fitness** (`hamming` touches every position) is the slow path; a real implementation would update fitness incrementally from `old → cur[pos]` and skip the full scan, exactly the cache trick Salvatore mentioned but didn't implement.

## Try it

1. Change `if (d <= best)` to `if (d < best)` (strict). Convergence stalls earlier — neutral moves were doing real work, walking sideways to set up future improvements.
2. Replace the full `hamming(cur)` rescore with an incremental update: `best += (cur[pos]==TARGET[pos]) - (old==TARGET[pos]);`. Same trajectory, no inner loop — the optimisation Salvatore wanted in the ZX program.
3. Cut the alphabet to `"HELO ZXSPECTRUM "` (only target letters). Watch how dramatically the search collapses: shrinking the mutation space is often a bigger win than tuning the acceptance rule.

## Go deeper

- Kirkpatrick, Gelatt, Vecchi, *Optimization by Simulated Annealing* (1983) — the original paper; the cooling schedule is the part the toy above omits.
- Spectrum video memory layout: <https://www.breakintoprogram.co.uk/hardware/computers/zx-spectrum/screen-memory-layout> — bitmap + 8×8 attribute bytes, exactly the structure Salvatore's program writes into.
- antirez, *Coding with LLMs in the summer of 2025*: <https://antirez.com/news/154> — the same designer/implementer split this lesson demonstrates, written up by the author.
- Floyd–Steinberg dithering: <https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering> — the deterministic algorithm whose output the evolutionary process is rediscovering.

*Click **next →** for the appendix to lesson 31.*
