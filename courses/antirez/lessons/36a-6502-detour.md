---
id: 36a-6502-detour
chapter: 10
label: "10.2"
title: A 6502 detour — meet the 8-bit cousin (easy6502)
prev: 00-asm-primer
next: null
status: draft
---

> **What this is.** A side trip out of C and into the **6502** — the 8-bit CPU
> that drove the Apple II (1977), Commodore 64 (1982), NES (1983), BBC Micro,
> and Atari 2600/800. The same machine-level ideas as x86-64 (registers,
> addressing modes, branches) but small enough to fit in your head in an
> afternoon. Pairs naturally with the ZX Spectrum lessons
> ([34](34-zx-spectrum-image-1.md)/[35](35-zx-spectrum-image-2.md)/[36](36-zx-spectrum-appendix.md))
> — different ISA (the Spectrum used the **Z80**), same constraints.
>
> No video accompanies this page — it's a synthetic detour.

## TL;DR

Open Nick Morgan's [**easy6502**](https://skilldrick.github.io/easy6502/),
type six lines into the simulator, hit *Assemble* then *Run*, and watch
pixels light up in the embedded 32×32 display. That's the entire toolchain:
assembler, emulator, framebuffer, in a browser tab. Then read his Snake
program for a self-contained example of a real 6502 game.

## The 6502 in one screen

| Resource | Count | Notes |
|---|---|---|
| 8-bit registers | **3** — `A` (accumulator), `X`, `Y` | x86-64 has 16, all 64-bit. |
| 16-bit registers | 2 — `PC` (program counter), `SP` (stack pointer) | Stack is hardwired to page `0x01XX`. |
| Status flags | 7 — `N V _ B D I Z C` | Set by arithmetic, tested by branches. |
| Address space | 64 KB (`0x0000`–`0xFFFF`) | Page 0 (`0x00`–`0xFF`) has faster addressing modes. |
| Instructions | 56 official opcodes | x86-64 has well over a thousand. |
| Clock | 1–3 MHz typical | A modern laptop emulates it ~1000× faster. |

Easy6502 maps memory `$0200–$05FF` to a 32×32, 16-colour pixel grid. Storing
a colour byte at one of those addresses paints that pixel — like the ZX
Spectrum's display file, just simpler.

## A six-line program: three coloured pixels

```asm
; Store three colour bytes at the start of the screen buffer.
LDA #$01     ; A = white
STA $0200    ; screen[0,0] := white
LDA #$05     ; A = green
STA $0201    ; screen[0,1] := green
LDA #$08     ; A = orange
STA $0202    ; screen[0,2] := orange
BRK          ; halt the simulator
```

Read it aloud: *"load A with 1, store A at \$0200; load A with 5, store at
\$0201; …"* That's it. Three loads, three stores, halt — and you've written
to a framebuffer the same way a 1977 game did.

## Try it now (interactive)

The simulator below is Nick Morgan's [easy6502](https://skilldrick.github.io/easy6502/),
vendored into this site so it works offline and across iframes. Edit the
code in the textarea, click **Assemble** then **Run** — coloured pixels
should appear at the top-left of the 32×32 black canvas:

<p><iframe
  src="vendor/easy6502/widget.html"
  width="100%" height="720" loading="lazy"
  sandbox="allow-scripts allow-same-origin"
  title="easy6502 interactive 6502 simulator"
  style="border:1px solid var(--ui-border, #444); border-radius:6px; background:#1d1f21;"></iframe></p>

If you want the full tutorial environment with all the worked examples
(Snake included), open it on the original site:
[easy6502 on skilldrick.github.io](https://skilldrick.github.io/easy6502/#first-program).

## Mapping it back to x86-64

| 6502 idea | x86-64 equivalent | Lesson reference |
|---|---|---|
| `LDA #$01` (immediate) | `mov eax, 1` | every snippet in [the primer](00-asm-primer.md) |
| `STA $0200` (absolute store) | `mov DWORD PTR [0x200], eax` | [10 — pointers intro](10-pointers-intro.md) |
| `LDA $20,X` (indexed) | `mov al, [rbx + rcx]` | [11 — pointer arithmetic](11-pointer-arithmetic.md) |
| `JSR sub` / `RTS` | `call sub` / `ret` | [04 — functions and expressions](04-functions-and-expressions.md) |
| `BNE label` | `jne label` | [07 — if, goto, recursion](07-if-goto-recursion.md) |
| Page-zero (`$00`–`$FF`) | (no equivalent — x86 treats all memory equally) | — |

The Snake demo on easy6502 (scroll all the way to "Snake") is a real
~120-line game: input handling, collision, scoring, all in 6502 asm. Read
it after you've done the three-pixel exercise.

## Modern note

You can still buy 6502 chips brand new in 2026 — WDC sells the **W65C02S**
for embedded work, and clones live on inside the C64 emulators every
retro-handheld console ships with. The architecture's most famous
descendant, the Apple IIgs's **65C816** (16-bit, used in the SNES), kept
the same register names and most addressing modes.

If you finish easy6502 and want more, try:

- **[VICE](https://vice-emu.sourceforge.io/)** — a serious C64 emulator with
  a built-in monitor that disassembles in real time.
- **[Acme assembler](https://sourceforge.net/projects/acme-crossass/)** —
  cross-assembler used by most modern C64/NES demoscene work.
- **[Bisqwit's NES emulator-from-scratch series](https://www.youtube.com/watch?v=y71lli8MS8s)**
  — building an NES (6502 + PPU + APU) in modern C++.

## Try it

1. Type the three-pixel program above into the iframe and run it. Then
   change the colour bytes (`$00` to `$0F`) until you've painted a
   miniature rainbow.
2. Replace the three `STA $020n` lines with a loop: load `X` with 32, then
   `STA $0200,X` / `DEX` / `BNE loop`. You just drew a horizontal line —
   without ever computing an address by hand.
3. Open the [Snake program](https://skilldrick.github.io/easy6502/#snake)
   in easy6502, hit *Assemble + Run*, then read the source top-to-bottom.
   Notice how a real game with input, RNG, and game-over fits in ~120
   lines of asm.

## Cross-reference

Most relevant antirez episodes from this course:

- [34 / 35](34-zx-spectrum-image-1.md) — Salvatore on bringing an evolving
  image up on a ZX Spectrum (Z80, sister 8-bit CPU). The same "store byte
  → pixel appears" framebuffer trick scales up here.
- [22 — System calls](22-system-calls.md) — on x86-64 the kernel sits
  between you and the framebuffer; on the 6502 there is no kernel.

## Go deeper

- [easy6502 main page](https://skilldrick.github.io/easy6502/) — the full
  tutorial, top to bottom. Maybe two hours.
- [6502.org](http://www.6502.org/) — the canonical archive: opcodes,
  reference cards, hardware datasheets, hobbyist projects.
- [*Programming the 6502* by Rodnay Zaks](https://archive.org/details/Programming_the_6502_OCR)
  — the 1978 textbook (free PDF on archive.org). Still the best teaching
  reference for the chip.
- [Visual6502.org](http://www.visual6502.org/) — a transistor-level
  simulation of the actual silicon, in your browser. Slower than easy6502,
  but you can watch the chip *think*.

*Back to the [asm primer](00-asm-primer.md), or to the [course landing](../../../antirez.html).*
