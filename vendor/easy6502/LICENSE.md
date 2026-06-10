# vendored easy6502

This directory contains an unmodified vendor copy of Nick Morgan's
[easy6502](https://skilldrick.github.io/easy6502/) simulator plus a small
host page (`widget.html`) that learnc uses to embed it.

We vendor the files because `skilldrick.github.io` sends
`X-Frame-Options: deny`, which prevents the live site from being iframed
cross-origin. Serving the simulator from the learnc origin sidesteps the
block (and lets the asm detour work offline).

## Files

| File | Origin | License |
|---|---|---|
| `assembler.js` | [skilldrick/easy6502@gh-pages](https://github.com/skilldrick/easy6502/blob/gh-pages/simulator/assembler.js) | © 2006-2010 Stian Soreng - 6502asm.com (custom permissive, see header in file). Maintained on top of that by Nick Morgan. |
| `sim.css` | [skilldrick/easy6502@gh-pages](https://github.com/skilldrick/easy6502/blob/gh-pages/simulator/style.css) | CC BY 4.0 (Nick Morgan, easy6502) |
| `jquery-1.7.2.min.js` | [code.jquery.com](https://code.jquery.com/jquery-1.7.2.min.js) | MIT |
| `widget.html` | learnc (this repo) | same license as the rest of learnc |

The upstream `easy6502` text and tutorial are released under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). We don't
redistribute the prose here - only the simulator engine - and the
attribution shown at the bottom of `widget.html` (and at the bottom of
the learnc lesson that embeds it) satisfies the CC BY 4.0 attribution
requirement.

## Updating

```sh
curl -L https://raw.githubusercontent.com/skilldrick/easy6502/gh-pages/simulator/assembler.js \
  -o vendor/easy6502/assembler.js
curl -L https://raw.githubusercontent.com/skilldrick/easy6502/gh-pages/simulator/style.css \
  -o vendor/easy6502/sim.css
```

There are no learnc-side patches to either file - they are byte-for-byte
upstream artifacts. The dark-theme overrides live in `widget.html` as a
CSS override on top of `sim.css`.
