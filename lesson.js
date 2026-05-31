// learnc — lesson.js
// Renders an individual lesson: fetches the .md file, parses frontmatter,
// extracts starter/expected code, wires up the editor + Run button.

import { mountEditor } from "./editor.js";
import { run as runC, onProgress as runOnProgress } from "./runner.js";
import { mountToggle as mountThemeToggle } from "./theme.js";
import { mountHelp as mountShortcuts } from "./shortcuts.js";

var GITHUB_BLOB_BASE = "https://github.com/b1tank/learnc/blob/main/lessons/";
var GITHUB_NEW_BASE = "https://github.com/b1tank/learnc/new/main/lessons";

var params = new URLSearchParams(location.search);
var lessonId = params.get("id");
// Guard: lesson ids are flat slugs (letters/digits/hyphens). Anything else
// is either a typo or a probe — refuse to feed it into fetch URLs, github
// links, or storage keys. Path-traversal style ids would otherwise resolve
// against the static site root.
if (lessonId !== null && !/^[A-Za-z0-9_-]+$/.test(lessonId)) {
  lessonId = null;
}

// Cached manifest (loaded lazily for the chapter breadcrumb).
//
// Plain `fetch()` (default cache mode) lets the browser reuse the
// cached manifest across lesson navigations. The previous `no-cache`
// forced a revalidation round-trip on every lesson view, which showed
// up as a measurable LCP hit. GitHub Pages serves manifest.json with a
// 10-minute max-age, so editors will still see fresh data within a
// couple of minutes; a hard refresh always bypasses this anyway.
var manifestPromise = null;
function getManifest() {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch("lessons/manifest.json")
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () {
      // Clear the cache so the next call retries instead of returning a
      // permanently-null promise after one network blip.
      manifestPromise = null;
      return null;
    });
  return manifestPromise;
}

function findChapter(manifest, id) {
  if (!manifest || !manifest.chapters) return null;
  for (var i = 0; i < manifest.chapters.length; i++) {
    var ch = manifest.chapters[i];
    for (var j = 0; j < (ch.items || []).length; j++) {
      if (ch.items[j].id === id) return ch;
    }
  }
  return null;
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tiny YAML-ish frontmatter parser. Supports key: value, strings, ints, null.
function parseFrontmatter(text) {
  var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  var meta = {};
  m[1].split(/\r?\n/).forEach(function (line) {
    var kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (!kv) return;
    var v = kv[2].trim();
    if (v === "null" || v === "") v = null;
    else if (/^-?\d+$/.test(v)) v = Number(v);
    else if (
      (v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') ||
      (v.charAt(0) === "'" && v.charAt(v.length - 1) === "'")
    ) v = v.slice(1, -1);
    meta[kv[1]] = v;
  });
  return { meta: meta, body: m[2] };
}

// Pull out the legacy single bottom-runner starter (```c:starter```) and its
// expected output (```output```). Only the FIRST output fence is consumed —
// and only when a starter exists — so that lessons built on the newer inline
// `c:run` blocks (which use their own ```output``` fences) keep theirs intact.
function extractFences(markdown) {
  var starterMatch = markdown.match(/```c:starter\r?\n([\s\S]*?)```/);
  if (!starterMatch) {
    // No bottom playground. Leave everything (including any c:run / output
    // fences) in the body for the inline runnable renderer below.
    return { starter: null, expected: null, body: markdown };
  }
  var expectedMatch = markdown.match(/```output\r?\n([\s\S]*?)```/);
  var cleaned = markdown
    .replace(/```c:starter\r?\n[\s\S]*?```\r?\n?/, "")
    .replace(/```output\r?\n[\s\S]*?```\r?\n?/, "");
  return {
    starter: starterMatch ? starterMatch[1].replace(/\r?\n$/, "") : null,
    expected: expectedMatch ? expectedMatch[1].replace(/\r?\n$/, "") : null,
    body: cleaned
  };
}

// Inline runnable blocks. A lesson can embed any number of self-contained,
// editable, runnable C programs with the fence:
//
//   ```c:run optional title here
//   ...full C program...
//   ```
//   ```output            <- optional; enables a pass/fail badge
//   ...expected stdout...
//   ```
//
// We pre-parse these out of the markdown BEFORE marked runs (marked drops
// everything after the first word of an info string, so a title couldn't
// survive in the class name) and swap each for a placeholder <div> that the
// inline renderer fills in after the prose is in the DOM.
function extractRunnables(markdown) {
  var blocks = [];
  // Match one `c:run` fence, then an OPTIONAL `output` fence right after it.
  // The output must be optional within a *single* alternative: with two
  // separate alternatives the code body's non-greedy `[\s\S]*?` backtracks
  // across its own closing fence to reach a later block's `output`, swallowing
  // the block in between. Anchoring the code close to `\n``` ` and making the
  // output group optional keeps each block self-contained.
  var re = /```c:run([^\n]*)\r?\n([\s\S]*?)\r?\n```[ \t]*(?:(?:[ \t]*\r?\n)+```output[^\n]*\r?\n([\s\S]*?)\r?\n```)?/g;
  var body = markdown.replace(re, function (whole, title, code, out) {
    title = (title || "").trim();
    code = (code || "").replace(/\r?\n$/, "");
    var expected = out != null ? out.replace(/\r?\n$/, "") : null;
    var idx = blocks.length;
    blocks.push({ title: title, code: code, expected: expected });
    // Blank lines keep marked from folding the div into a paragraph.
    return "\n\n<div class=\"runnable-slot\" data-idx=\"" + idx + "\"></div>\n\n";
  });
  return { body: body, blocks: blocks };
}

// Shareable code state in URL hash: #code=<urlsafe-base64(utf8(code))>.
// Plain base64 would leak '+' and '/' into the hash, which most browsers
// accept but chat apps (Slack/Discord) and email clients tend to mangle.
// We use the url-safe alphabet (- and _) and drop '=' padding.
function b64uEncode(str) {
  // encodeURIComponent first so non-ASCII (rare in C, but possible in
  // comments) survives the btoa byte boundary.
  return btoa(encodeURIComponent(str))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64uDecode(b) {
  // Restore padding to a multiple of 4 before atob.
  var s = b.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(atob(s));
}

function readUrlCode() {
  if (!location.hash) return null;
  try {
    var m = location.hash.match(/#code=([^&]+)/);
    if (!m) return null;
    return b64uDecode(m[1]);
  } catch (e) {
    return null;
  }
}

function writeUrlCode(code) {
  try {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#code=" + b64uEncode(code)
    );
  } catch (e) { /* ignore */ }
}

function clearUrlCode() {
  history.replaceState(null, "", location.pathname + location.search);
}

function lessonStorageKey() {
  return "learnc:code:" + lessonId;
}

// Tiny DOM helper. Same shape as app.js's `el`. Kept local to avoid the
// "shared module" anti-pattern for an 8-line function.
function el(tag, attrs, children) {
  var e = document.createElement(tag);
  attrs = attrs || {};
  for (var k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
    if (k === "class") e.className = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  (children || []).forEach(function (c) {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function renderStub() {
  var titleEl = document.getElementById("lesson-title");
  titleEl.textContent = "Stub: " + lessonId;
  titleEl.classList.remove("lesson-title-empty");
  var prose = document.getElementById("lesson-prose");
  prose.innerHTML = "";

  var createHref = GITHUB_NEW_BASE + "?filename=" +
    encodeURIComponent(lessonId + ".md");

  var notice = el("div", { class: "stub-notice" }, [
    el("strong", {}, ["No walkthrough yet."]),
    " This lesson is a stub waiting for content. Want to contribute? ",
    el("a", { href: createHref }, [
      "Create ",
      el("code", {}, ["lessons/" + lessonId + ".md"]),
      " on GitHub"
    ]),
    " using ",
    el("a", { href: "https://github.com/b1tank/learnc/blob/main/lessons/_template.md" },
      ["the lesson template"]),
    "."
  ]);
  prose.appendChild(notice);

  var pointer = el("p", { class: "muted small" }, [
    "The site loads lessons from markdown files in the ",
    el("a", { href: "https://github.com/b1tank/learnc/tree/main/lessons" },
      ["lessons/"]),
    " directory at runtime. See ",
    el("a", { href: "https://github.com/b1tank/learnc/blob/main/CONTRIBUTING.md" },
      ["CONTRIBUTING.md"]),
    "."
  ]);
  prose.appendChild(pointer);

  document.getElementById("runner-container").hidden = true;
  document.getElementById("edit-link").href = createHref;
}

function setupNav(meta) {
  var prev = document.getElementById("prev-link");
  var next = document.getElementById("next-link");
  if (meta.prev) {
    prev.href = "lesson.html?id=" + encodeURIComponent(meta.prev);
    prev.classList.remove("disabled");
  }
  if (meta.next) {
    next.href = "lesson.html?id=" + encodeURIComponent(meta.next);
    next.classList.remove("disabled");
  }

  // Keyboard shortcuts: ← / → jump to prev / next lesson. Ignore when the
  // user is typing in an input, textarea, or the CodeMirror editor, or when
  // any modifier key is held (so browser shortcuts like Cmd-← "back" still work).
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    var t = e.target;
    if (t && t.closest) {
      if (t.closest(".cm-editor")) return;
      var tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
    }
    if (e.key === "ArrowLeft" && meta.prev) {
      e.preventDefault();
      location.href = "lesson.html?id=" + encodeURIComponent(meta.prev);
    } else if (e.key === "ArrowRight" && meta.next) {
      e.preventDefault();
      location.href = "lesson.html?id=" + encodeURIComponent(meta.next);
    }
  });
}

// Decorate every <pre> in the prose with a small "copy" button. The editor
// (CodeMirror) and the terminal already have their own buttons; only the
// inert markdown code blocks need this.
function addCopyButtons(root) {
  if (!root) return;
  var pres = root.querySelectorAll("pre");
  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.setAttribute("aria-label", "copy code to clipboard");
    (function (pre, btn) {
      btn.addEventListener("click", function () {
        var code = pre.querySelector("code");
        var text = code ? code.textContent : pre.textContent;
        var done = function () {
          btn.textContent = "copied";
          setTimeout(function () { btn.textContent = "copy"; }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            btn.textContent = "failed";
            setTimeout(function () { btn.textContent = "copy"; }, 1500);
          });
        } else {
          // Fallback: select + execCommand (best-effort on older browsers).
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(pre);
          sel.removeAllRanges(); sel.addRange(range);
          try { document.execCommand("copy"); done(); } catch (_) {}
          sel.removeAllRanges();
        }
      });
    })(pre, btn);
    pre.appendChild(btn);
  }
}

var editorAPI = null;

// Render a {stdout, stderr} result into a terminal element, and (when an
// expected string is supplied) flip a pass/fail badge. Shared by the legacy
// bottom runner and every inline runnable block.
function renderInto(termEl, badgeEl, result, expected) {
  var html = "";
  if (result.stdout) html += escapeHTML(result.stdout);
  if (result.stderr) html += '<span class="terminal-error">' + escapeHTML(result.stderr) + "</span>";
  if (!html) html = '<span class="terminal-empty">(no output)</span>';
  termEl.innerHTML = html;

  if (!badgeEl) return;
  if (expected != null && result.stdout != null) {
    var norm = function (s) { return String(s || "").replace(/\r\n/g, "\n").replace(/\s+$/, ""); };
    if (norm(result.stdout) === norm(expected)) {
      badgeEl.textContent = "\u2713 output matches expected";
      badgeEl.className = "diff-badge diff-ok";
    } else {
      badgeEl.textContent = "\u2717 output does not match expected";
      badgeEl.className = "diff-badge diff-bad";
    }
  } else {
    badgeEl.textContent = "";
    badgeEl.className = "diff-badge";
  }
}

// The WASM C runtime needs SharedArrayBuffer, which only exists when the page
// is crossOriginIsolated. If it isn't, explain exactly what's wrong instead of
// letting Runno throw an opaque "Can't find variable: SharedArrayBuffer".
// Returns true when it's safe to run.
function ensureCrossOriginIsolated(termEl) {
  if (typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated) return true;
  termEl.innerHTML =
    '<span class="terminal-error">' +
    escapeHTML(
      "this browser is not cross-origin-isolated, so the WASM C " +
      "runtime can't start.\n\n" +
      "crossOriginIsolated: " + self.crossOriginIsolated + "\n" +
      "SharedArrayBuffer:   " + (typeof SharedArrayBuffer !== "undefined") + "\n" +
      "isSecureContext:     " + self.isSecureContext + "\n\n" +
      "if you're on a phone over the LAN, open the site at " +
      "https://b1tank.github.io/learnc/ instead — the COOP/COEP " +
      "service worker only registers over HTTPS.\n" +
      "if you're on localhost, try a hard refresh."
    ) +
    "</span>";
  return false;
}

// Compile + run `code`, streaming progress into `termEl` and final output
// into termEl/badgeEl. `btn` is disabled for the duration. Self-contained so
// inline blocks and the bottom runner share one code path.
async function compileAndRun(code, termEl, badgeEl, expected, btn) {
  if (!ensureCrossOriginIsolated(termEl)) return;
  termEl.innerHTML = '<span class="terminal-empty">compiling and running\u2026</span>';
  if (badgeEl) badgeEl.textContent = "";
  if (btn) btn.disabled = true;
  runOnProgress(function (msg) {
    termEl.innerHTML = '<span class="terminal-empty">' + escapeHTML(msg) + "</span>";
  });
  try {
    var result = await runC(code);
    renderInto(termEl, badgeEl, result, expected);
  } catch (e) {
    termEl.innerHTML = '<span class="terminal-error">' + escapeHTML(String(e && e.message || e)) + "</span>";
  } finally {
    if (btn) btn.disabled = false;
    runOnProgress(null);
  }
}

// Build one inline runnable widget (toolbar + editor + terminal + optional
// badge) from a parsed { title, code, expected } block. Returns the root
// element plus a setDark hook for theme syncing.
function buildRunnable(block) {
  var root = el("div", { class: "runner runnable" }, []);

  var bar = el("div", { class: "runner-bar" }, []);
  bar.appendChild(el("span", { class: "title" }, [block.title || "main.c"]));
  var runBtn = el("button", { type: "button", class: "primary" }, ["run"]);
  bar.appendChild(runBtn);
  root.appendChild(bar);

  var editorHost = el("div", { class: "editor" }, []);
  root.appendChild(editorHost);

  var term = el("div", { class: "terminal" }, [
    el("span", { class: "terminal-empty" }, ['click "run" to compile and execute'])
  ]);
  root.appendChild(term);

  var badge = null;
  if (block.expected != null) {
    badge = el("div", { class: "diff-badge" }, []);
    root.appendChild(badge);
  }

  var api = mountEditor(editorHost, block.code, null);

  runBtn.addEventListener("click", function () {
    compileAndRun(api.getValue(), term, badge, block.expected, runBtn);
  });

  return { element: root, setDark: api.setDark };
}

// Replace every <div.runnable-slot> placeholder left by extractRunnables with
// a live runnable widget, and keep all their editors in theme sync.
function mountInlineRunnables(prose, blocks) {
  if (!blocks || !blocks.length) return;
  var apis = [];
  var slots = prose.querySelectorAll("div.runnable-slot");
  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    var idx = Number(slot.getAttribute("data-idx"));
    var block = blocks[idx];
    if (!block) continue;
    var widget = buildRunnable(block);
    slot.parentNode.replaceChild(widget.element, slot);
    apis.push(widget);
  }
  document.addEventListener("learnc:theme", function (e) {
    apis.forEach(function (a) { if (a.setDark) a.setDark(!!e.detail.isDark); });
  });
}

// Insert a dismissible banner above the editor when the editor was filled
// from a `#code=` shared link. Offers a reset back to the lesson starter so
// the learner doesn't think their localStorage draft is gone forever.
function showSharedBanner(container, sharedCode, savedCode, starter) {
  if (document.querySelector(".shared-banner")) return; // idempotent
  var banner = el("div", { class: "shared-banner" }, []);
  var msg = el("span", {}, ["Editor loaded from a shared link."]);
  banner.appendChild(msg);

  if (savedCode && savedCode !== sharedCode) {
    var restore = el("button", { type: "button", class: "linklike" },
      ["restore my saved version"]);
    restore.addEventListener("click", function () {
      if (editorAPI) editorAPI.setValue(savedCode);
      writeUrlCode("");
      banner.remove();
    });
    banner.appendChild(restore);
  }

  var reset = el("button", { type: "button", class: "linklike" },
    ["reset to lesson starter"]);
  reset.addEventListener("click", function () {
    if (editorAPI) editorAPI.setValue(starter || "");
    writeUrlCode("");
    banner.remove();
  });
  banner.appendChild(reset);

  var dismiss = el("button", { type: "button", class: "linklike dismiss",
    "aria-label": "dismiss" }, ["\u00D7"]);
  dismiss.addEventListener("click", function () { banner.remove(); });
  banner.appendChild(dismiss);

  container.insertBefore(banner, container.firstChild);
}

function setupRunner(starter, expected) {
  var container = document.getElementById("runner-container");
  container.hidden = false;

  // Detect a shared-link override before localStorage so we can warn the
  // learner that their in-progress edits were swapped out for the link's code.
  var sharedCode = readUrlCode();
  var localCode = localStorage.getItem(lessonStorageKey());
  var initial = sharedCode || localCode || starter || "";
  // Debounce the localStorage writes — every keystroke fires onChange, and
  // for a long program that's many small writes/sec. 200ms is plenty fast
  // for survive-a-reload semantics without thrashing.
  var saveTimer = null;
  editorAPI = mountEditor(document.getElementById("editor"), initial, function (code) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(lessonStorageKey(), code); } catch (e) { /* quota */ }
    }, 200);
  });

  // Keep the editor's CodeMirror theme in sync with the page theme whenever
  // the user cycles the toggle. The editor also listens to matchMedia on its
  // own for OS-level changes when no manual override is pinned.
  document.addEventListener("learnc:theme", function (e) {
    if (editorAPI && editorAPI.setDark) editorAPI.setDark(!!e.detail.isDark);
  });

  if (sharedCode) {
    showSharedBanner(container, sharedCode, localCode, starter);
  }

  document.getElementById("run-btn").addEventListener("click", async function () {
    var code = editorAPI.getValue();
    writeUrlCode(code);
    var term = document.getElementById("terminal");
    var badge = document.getElementById("diff-badge");
    var btn = document.getElementById("run-btn");
    await compileAndRun(code, term, badge, expected, btn);
  });

  document.getElementById("reset-btn").addEventListener("click", function () {
    if (!starter) return;
    if (!confirm("Reset editor to starter code?")) return;
    editorAPI.setValue(starter);
    try { localStorage.removeItem(lessonStorageKey()); } catch (e) { /* ignore */ }
    clearUrlCode();
  });

  document.getElementById("share-btn").addEventListener("click", function () {
    writeUrlCode(editorAPI.getValue());
    var btn = document.getElementById("share-btn");
    var orig = btn.textContent;
    var ok = function () {
      btn.textContent = "copied!";
      setTimeout(function () { btn.textContent = orig; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(ok, function () {
        prompt("Copy this URL:", location.href);
      });
    } else {
      prompt("Copy this URL:", location.href);
    }
  });
}

async function loadLesson() {
  // Theme toggle is the same everywhere; mount it as soon as the page is up.
  mountThemeToggle(document.getElementById("theme-toggle-slot"));
  mountShortcuts([
    { keys: ["\u2190", "\u2192"], label: "previous / next lesson" },
    { keys: ["Ctrl+Enter", "Cmd+Enter"], label: "run the current code" },
    { keys: ["?"], label: "show this help" },
    { keys: ["Esc"], label: "close help" }
  ]);

  // Ctrl/Cmd+Enter triggers the run button from anywhere on the page,
  // including inside the CodeMirror editor.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      var btn = document.getElementById("run-btn");
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
    }
  });

  if (!lessonId) {
    document.getElementById("lesson-title").textContent = "No lesson selected";
    document.getElementById("lesson-prose").innerHTML =
      '<p>Pick a lesson from the <a href="index.html">index</a>.</p>';
    document.getElementById("runner-container").hidden = true;
    return;
  }

  document.getElementById("edit-link").href = GITHUB_BLOB_BASE + lessonId + ".md";

  // Kick off the manifest fetch in parallel with the lesson fetch — both are
  // needed to populate the breadcrumb without a visible flash.
  var manifestPromise = getManifest().catch(function () { return null; });

  var url = "lessons/" + lessonId + ".md";
  // If the inline boot script in lesson.html kicked off the fetch
  // already, await its promise instead of issuing a duplicate request.
  // That lets the fetch overlap with HTML parse + lesson.js download
  // instead of starting only after this function runs.
  var r;
  try {
    r = await (window.__lessonMdPromise || fetch(url));
  } catch (e) {
    await renderCrumbs(manifestPromise, null);
    renderStub();
    return;
  }
  if (!r.ok) {
    await renderCrumbs(manifestPromise, null);
    renderStub();
    return;
  }
  var text = await r.text();
  var parsed = parseFrontmatter(text);
  var meta = parsed.meta;
  var fences = extractFences(parsed.body);
  // Pull inline `c:run` blocks out of the prose and replace them with
  // placeholder slots that mountInlineRunnables fills in after render.
  var runnables = extractRunnables(fences.body);

  document.title = (meta.title || lessonId) + " · learnc";
  var titleEl = document.getElementById("lesson-title");
  titleEl.textContent = meta.title || lessonId;
  titleEl.classList.remove("lesson-title-empty");

  // Render prose markdown
  /* global marked */
  var prose = document.getElementById("lesson-prose");
  if (typeof marked !== "undefined") {
    marked.setOptions({ headerIds: false, mangle: false });
    prose.innerHTML = marked.parse(runnables.body);
  } else {
    prose.innerHTML = "<pre>" + escapeHTML(runnables.body) + "</pre>";
  }
  addCopyButtons(prose);
  mountInlineRunnables(prose, runnables.blocks);

  if (fences.starter !== null) {
    setupRunner(fences.starter, fences.expected);
  }

  setupNav(meta);

  await renderCrumbs(manifestPromise, meta);
}

// Populate the breadcrumb with `lessons / Ch N. Title / X.Y Lesson title` and
// reveal it. The `.ready` class is what flips the .crumbs visibility from
// hidden to visible, so the whole row appears in one paint.
async function renderCrumbs(manifestPromise, meta) {
  var crumbsEl = document.getElementById("crumbs");
  var chapterCrumb = document.getElementById("lesson-chapter-crumb");
  var labelEl = document.getElementById("lesson-label");
  var manifest = await manifestPromise;

  if (manifest) {
    var ch = findChapter(manifest, lessonId);
    if (ch) {
      chapterCrumb.textContent = " / Ch " + ch.n + ". " + ch.title;
    }
  }
  var labelText;
  if (meta) {
    var label = meta.label || meta.id || lessonId;
    var title = meta.title || "";
    labelText = title ? (label + " " + title) : label;
  } else {
    labelText = lessonId;
  }
  labelEl.textContent = " / " + labelText;
  if (crumbsEl) crumbsEl.classList.add("ready");
}

loadLesson().catch(function (err) {
  document.getElementById("lesson-prose").innerHTML =
    '<p class="terminal-error">Error loading lesson: ' + escapeHTML(err && err.message || err) + "</p>";
});
