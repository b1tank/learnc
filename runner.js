// learnc — runner.js
// C compile + run in the browser, using Runno's clang+wasi-libc WASM blobs.
//
// Why we don't use @runno/runtime's headlessRunCode:
//   Upstream's headlessRunCode catches the PrepareError thrown by a failed
//   compile and serializes it down to { message, type } via makeRunnoError,
//   throwing away the captured clang stderr (the actual line-numbered
//   diagnostic). For a learning tool that's the most useful information,
//   so we reimplement the compile→link→run pipeline here against the
//   lower-level @runno/wasi API and keep the stderr buffer intact.
//
// The pipeline mirrors @runno/runtime@0.10.0's commandsForRuntime("clang"):
//   1. fetch clang-fs.tar.gz (the wasi-libc sysroot) into a WASIFS
//   2. run clang.wasm to produce /program.o
//   3. run wasm-ld.wasm to produce /program.wasm
//   4. run /program.wasm with user-provided stdin
// If any step exits non-zero we return immediately with the accumulated
// stderr so the lesson terminal shows clang's real complaint.
//
// First load downloads ~10–15 MB of WASM blobs from runno.dev/langs and
// the browser caches them; subsequent runs are near-instant.
//
// Contract (matches lesson.js): run(code, stdin?) -> { stdout, stderr, exit }.

const WASI_URL = "https://esm.sh/@runno/wasi@0.10.0";
const RUNTIME_URL = "https://esm.sh/@runno/runtime@0.10.0";

// Clang assets are baked into Runno at this base URL — see commands.ts in
// the upstream package (the const dt = "https://runno.dev/langs" line in
// the bundle).
const LANG_BASE = "https://runno.dev/langs";

// Prepare commands lifted verbatim from @runno/runtime@0.10.0's
// commandsForRuntime("clang"), with two deliberate edits:
//   - "-fcolor-diagnostics" is dropped so clang emits plain text; our HTML
//     terminal does not interpret ANSI escape sequences and the raw \x1b[…]
//     bytes would just clutter the message.
//   - "-fmessage-length" stays at 80 so wrapped diagnostics stay readable.
// The "wasm32-unkown-wasi" misspelling is upstream's; clang accepts it as a
// vendor-os tuple regardless, so we keep parity rather than diverge.
function clangPrepareCommands() {
  return [
    {
      binaryURL: LANG_BASE + "/clang.wasm",
      binaryName: "clang",
      args: [
        "-cc1", "-Werror", "-triple", "wasm32-unkown-wasi",
        "-isysroot", "/sys",
        "-internal-isystem", "/sys/include",
        "-internal-isystem", "/sys/lib/clang/8.0.1/include",
        "-ferror-limit", "4",
        "-fmessage-length", "80",
        "-O2", "-emit-obj",
        "-o", "/program.o",
        "/program"
      ],
      env: {},
      baseFSURL: LANG_BASE + "/clang-fs.tar.gz"
    },
    {
      binaryURL: LANG_BASE + "/wasm-ld.wasm",
      binaryName: "wasm-ld",
      args: [
        "--no-threads",
        "--export-dynamic",
        "-z", "stack-size=1048576",
        "-L/sys/lib/wasm32-wasi",
        "/sys/lib/wasm32-wasi/crt1.o",
        "/program.o",
        "-lc",
        "-o", "/program.wasm"
      ],
      env: {}
    }
  ];
}

let depsPromise = null;
function loadDeps() {
  if (!depsPromise) {
    depsPromise = Promise.all([
      import(/* @vite-ignore */ WASI_URL),
      import(/* @vite-ignore */ RUNTIME_URL)
    ]).then(function (mods) {
      return {
        WASIWorkerHost: mods[0].WASIWorkerHost,
        fetchWASIFS: mods[1].fetchWASIFS
      };
    }).catch(function (e) {
      depsPromise = null; // allow retry on next click
      throw new Error(
        "Failed to load the Runno runtime from esm.sh.\n" +
        "Check your network or the browser console for details.\n\n" +
        (e && e.message ? e.message : String(e))
      );
    });
  }
  return depsPromise;
}

// Optional progress hook so lesson.js can show "downloading compiler…" on
// first run. Not required.
let progressCb = null;
export function onProgress(fn) { progressCb = fn; }
function progress(msg) { try { if (progressCb) progressCb(msg); } catch (e) {} }

// Runs one WASI command against the given filesystem; returns the next
// filesystem plus the step's exit code and captured stdout/stderr. Stdin is
// pushed in full before start() (good enough for non-interactive student
// programs; we don't need worker-side streaming).
async function runStep(WASIWorkerHost, binaryURL, binaryName, args, env, fs, stdin) {
  let stdout = "";
  let stderr = "";
  const host = new WASIWorkerHost(binaryURL, {
    args: [binaryName].concat(args || []),
    env: env || {},
    fs: fs,
    stdout: function (s) { stdout += s; },
    stderr: function (s) { stderr += s; }
  });
  if (stdin) {
    // IMPORTANT: do NOT await these. pushStdin writes the encoded bytes plus
    // a length prefix into a SharedArrayBuffer; pushEOF then spins until that
    // length goes back to 0, which only happens once the worker (started
    // below) consumes the buffer. Awaiting here would deadlock. Runno's own
    // headless runner uses the same fire-and-forget pattern.
    host.pushStdin(stdin);
    host.pushEOF();
  }
  const result = await host.start();
  return { fs: result.fs, exitCode: result.exitCode, stdout: stdout, stderr: stderr };
}

export async function run(code, stdin) {
  try {
    progress("loading clang (first run only, ~10MB)…");
    const { WASIWorkerHost, fetchWASIFS } = await loadDeps();
    progress("compiling…");

    // Seed the WASIFS with the user's source at /program. Clang reads it as
    // a string-mode file — same shape headlessRunCode uses internally.
    let fs = {
      "/program": {
        path: "program",
        content: code,
        mode: "string",
        timestamps: {
          access: new Date(),
          modification: new Date(),
          change: new Date()
        }
      }
    };

    const prepareCommands = clangPrepareCommands();
    const baseFSCache = {}; // memoise per-command baseFS fetches within a single run

    for (let i = 0; i < prepareCommands.length; i++) {
      const cmd = prepareCommands[i];
      if (cmd.baseFSURL) {
        // fetchWASIFS untars the file into a WASIFS dict. Browser HTTP
        // cache handles the repeated download on subsequent compiles.
        const baseFS = baseFSCache[cmd.baseFSURL] || (baseFSCache[cmd.baseFSURL] = await fetchWASIFS(cmd.baseFSURL));
        fs = Object.assign({}, fs, baseFS);
      }
      progress(cmd.binaryName === "clang" ? "compiling…" : "linking…");
      const step = await runStep(
        WASIWorkerHost, cmd.binaryURL, cmd.binaryName, cmd.args, cmd.env, fs, ""
      );
      fs = step.fs;
      if (step.exitCode !== 0) {
        // Surface the compile/link diagnostic verbatim. clang prints to
        // stderr; nothing useful normally lands on stdout for these steps.
        const tag = cmd.binaryName === "clang" ? "compile error" : "link error";
        const body = (step.stderr || step.stdout || "").trimEnd();
        return {
          stdout: step.stdout || "",
          stderr: body
            ? body + "\n[" + tag + ": " + cmd.binaryName + " exited " + step.exitCode + "]"
            : "[" + tag + ": " + cmd.binaryName + " exited " + step.exitCode + " with no diagnostic]",
          exit: step.exitCode || 1
        };
      }
    }

    progress("running…");
    // wasm-ld left the linked program at /program.wasm. WASIWorkerHost
    // expects a URL it can fetch, so wrap the file's bytes in a Blob URL —
    // same trick Runno's getBinaryPathFromCommand uses for fsPath commands.
    const programFile = fs["/program.wasm"];
    if (!programFile || programFile.mode !== "binary") {
      throw new Error("link succeeded but /program.wasm is missing");
    }
    const programBlobURL = URL.createObjectURL(
      new Blob([programFile.content], { type: "application/wasm" })
    );
    let finalStep;
    try {
      finalStep = await runStep(
        WASIWorkerHost, programBlobURL, "program", [], {}, fs, stdin || ""
      );
    } finally {
      URL.revokeObjectURL(programBlobURL);
    }
    return {
      stdout: finalStep.stdout || "",
      stderr: finalStep.stderr || "",
      exit: typeof finalStep.exitCode === "number" ? finalStep.exitCode : 0
    };
  } catch (e) {
    return {
      stdout: "",
      stderr: "[learnc runner error]\n" + ((e && e.message) || String(e)),
      exit: 1
    };
  }
}
