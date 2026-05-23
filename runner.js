// learnc — runner.js
// C compile + run in the browser via Runno (https://runno.dev).
// Runno bundles a pre-built clang + wasi-libc as WebAssembly; we hand it the
// source string and it returns stdout/stderr/exit. The first run downloads
// roughly 10–15 MB of WASM blobs from assets.runno.run and caches them in the
// browser. Subsequent runs are near-instant.
//
// We dynamic-import the module so a load failure shows a clean error in the
// terminal instead of breaking the whole lesson page.
//
// Contract (matches lesson.js): run(code, stdin?) -> { stdout, stderr, exit }.

const RUNNO_URL = "https://esm.sh/@runno/runtime@0.10.0";

let runnoPromise = null;
function loadRunno() {
  if (!runnoPromise) {
    runnoPromise = import(/* @vite-ignore */ RUNNO_URL).catch(function (e) {
      runnoPromise = null; // allow retry on next click
      throw new Error(
        "Failed to load the Runno runtime from esm.sh.\n" +
        "Check your network or the browser console for details.\n\n" +
        (e && e.message ? e.message : String(e))
      );
    });
  }
  return runnoPromise;
}

// Optional progress hook so lesson.js can show "downloading compiler…" on
// first run. Not required.
let progressCb = null;
export function onProgress(fn) { progressCb = fn; }
function progress(msg) { try { if (progressCb) progressCb(msg); } catch (e) {} }

export async function run(code, stdin) {
  try {
    progress("loading clang (first run only, ~10MB)…");
    const runno = await loadRunno();
    progress("compiling and running…");

    // Runno's headless API: headlessRunCode(runtime, code, stdin?)
    // Returns: { resultType, tty, stdout, stderr, exit, fs }
    const result = await runno.headlessRunCode("clang", code, stdin || "");

    if (result.resultType === "crash") {
      // KNOWN LIMITATION: when the prepare (compile) step fails, Runno
      // throws and serializes the error down to { message, type }, dropping
      // the captured stderr from clang. So we cannot surface line-numbered
      // diagnostics here yet. Runtime errors (non-zero exit after a
      // successful compile) DO carry stderr — see the "complete" branch
      // below. Tracking: upstream needs to keep result.data on the crash.
      var msg = (result.error && result.error.message) || "unknown";
      var hint = /Prepare step/i.test(msg)
        ? "compilation failed (Runno does not yet surface clang's diagnostic text).\n" +
          "Re-read your source, especially the line you just changed."
        : msg;
      return {
        stdout: result.stdout || "",
        stderr:
          (result.stderr || "") +
          (result.stderr ? "\n" : "") +
          "[crash] " + hint,
        exit: 1
      };
    }
    if (result.resultType === "terminated") {
      return {
        stdout: result.stdout || "",
        stderr: (result.stderr || "") + "\n[terminated]",
        exit: 137
      };
    }
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exit: typeof result.exit === "number" ? result.exit : 0
    };
  } catch (e) {
    return {
      stdout: "",
      stderr: "[learnc runner error]\n" + ((e && e.message) || String(e)),
      exit: 1
    };
  }
}
