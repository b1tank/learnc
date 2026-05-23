// learnc — runner.js
// Compiles and runs C in the browser via WebAssembly.
//
// STATUS: stub. The real WASM C compiler integration is the next milestone.
// Candidates being evaluated: Runno (wasi-clang wrapper), @wasmer/sdk + wasi-clang,
// and TCC-WASM. See README.md and the "compiler spike" issue on GitHub.
//
// The signature below is the contract: a single async function that takes source
// code and returns { stdout, stderr, exit }. When the real compiler lands, only
// this file should need to change.

export async function run(code) {
  await new Promise(function (r) { setTimeout(r, 150); });
  return {
    stdout: "",
    stderr:
      "[learnc] The WebAssembly C compiler is not wired up yet.\n" +
      "Once it lands, clicking 'run' will compile and execute this code in your browser.\n\n" +
      "Track progress: https://github.com/b1tank/learnc\n\n" +
      "Your code (" + code.length + " chars, " + code.split(/\n/).length + " lines) is saved\n" +
      "locally and to the URL hash, so the editor state survives reloads and is shareable.",
    exit: 0
  };
}
