// learnc — lesson.js
// Renders an individual lesson: fetches the .md file, parses frontmatter,
// extracts starter/expected code, wires up the editor + Run button.

import { mountEditor } from "./editor.js";
import { run as runC, onProgress as runOnProgress } from "./runner.js";

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
var manifestPromise = null;
function getManifest() {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch("lessons/manifest.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });
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

function extractFences(markdown) {
  var starterMatch = markdown.match(/```c:starter\r?\n([\s\S]*?)```/);
  var expectedMatch = markdown.match(/```output\r?\n([\s\S]*?)```/);
  var cleaned = markdown
    .replace(/```c:starter\r?\n[\s\S]*?```\r?\n?/g, "")
    .replace(/```output\r?\n[\s\S]*?```\r?\n?/g, "");
  return {
    starter: starterMatch ? starterMatch[1].replace(/\r?\n$/, "") : null,
    expected: expectedMatch ? expectedMatch[1].replace(/\r?\n$/, "") : null,
    body: cleaned
  };
}

// Shareable code state in URL hash: #code=<base64(encodeURIComponent(code))>
function readUrlCode() {
  if (!location.hash) return null;
  try {
    var m = location.hash.match(/#code=([^&]+)/);
    if (!m) return null;
    return decodeURIComponent(atob(m[1]));
  } catch (e) {
    return null;
  }
}

function writeUrlCode(code) {
  try {
    var b = btoa(encodeURIComponent(code));
    history.replaceState(null, "", location.pathname + location.search + "#code=" + b);
  } catch (e) { /* ignore */ }
}

function clearUrlCode() {
  history.replaceState(null, "", location.pathname + location.search);
}

function lessonStorageKey() {
  return "learnc:code:" + lessonId;
}

function renderStub() {
  document.getElementById("lesson-title").textContent = "Stub: " + lessonId;
  document.getElementById("lesson-prose").innerHTML =
    '<div class="stub-notice">' +
    '<strong>No walkthrough yet.</strong> This lesson is a stub waiting for content. ' +
    'Want to contribute? <a href="' + GITHUB_NEW_BASE + '?filename=' +
    encodeURIComponent(lessonId + ".md") + '">Create <code>lessons/' +
    escapeHTML(lessonId) + '.md</code> on GitHub</a> using ' +
    '<a href="https://github.com/b1tank/learnc/blob/main/lessons/_template.md">the lesson template</a>.' +
    '</div>' +
    '<p class="muted small">The site loads lessons from markdown files in the ' +
    '<a href="https://github.com/b1tank/learnc/tree/main/lessons">lessons/</a> directory at runtime. ' +
    'See <a href="https://github.com/b1tank/learnc/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>';
  document.getElementById("runner-container").hidden = true;
  document.getElementById("edit-link").href = GITHUB_NEW_BASE +
    "?filename=" + encodeURIComponent(lessonId + ".md");
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

function renderResult(result, expected) {
  var term = document.getElementById("terminal");
  var html = "";
  if (result.stdout) html += escapeHTML(result.stdout);
  if (result.stderr) html += '<span class="terminal-error">' + escapeHTML(result.stderr) + "</span>";
  if (!html) html = '<span class="terminal-empty">(no output)</span>';
  term.innerHTML = html;

  var badge = document.getElementById("diff-badge");
  if (expected != null && result.stdout != null) {
    var norm = function (s) { return String(s || "").replace(/\r\n/g, "\n").replace(/\s+$/, ""); };
    if (norm(result.stdout) === norm(expected)) {
      badge.textContent = "\u2713 output matches expected";
      badge.className = "diff-badge diff-ok";
    } else {
      badge.textContent = "\u2717 output does not match expected";
      badge.className = "diff-badge diff-bad";
    }
  } else {
    badge.textContent = "";
    badge.className = "diff-badge";
  }
}

function setupRunner(starter, expected) {
  var container = document.getElementById("runner-container");
  container.hidden = false;

  var initial = readUrlCode() || localStorage.getItem(lessonStorageKey()) || starter || "";
  editorAPI = mountEditor(document.getElementById("editor"), initial, function (code) {
    try { localStorage.setItem(lessonStorageKey(), code); } catch (e) { /* quota */ }
  });

  document.getElementById("run-btn").addEventListener("click", async function () {
    var code = editorAPI.getValue();
    writeUrlCode(code);
    var term = document.getElementById("terminal");
    var btn = document.getElementById("run-btn");
    term.innerHTML = '<span class="terminal-empty">compiling and running\u2026</span>';
    document.getElementById("diff-badge").textContent = "";
    btn.disabled = true;
    runOnProgress(function (msg) {
      term.innerHTML = '<span class="terminal-empty">' + escapeHTML(msg) + "</span>";
    });
    try {
      var result = await runC(code);
      renderResult(result, expected);
    } catch (e) {
      term.innerHTML = '<span class="terminal-error">' + escapeHTML(String(e && e.message || e)) + "</span>";
    } finally {
      btn.disabled = false;
      runOnProgress(null);
    }
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
  if (!lessonId) {
    document.getElementById("lesson-title").textContent = "No lesson selected";
    document.getElementById("lesson-prose").innerHTML =
      '<p>Pick a lesson from the <a href="index.html">index</a>.</p>';
    document.getElementById("runner-container").hidden = true;
    return;
  }

  document.getElementById("edit-link").href = GITHUB_BLOB_BASE + lessonId + ".md";
  document.getElementById("lesson-label").textContent = lessonId;

  var url = "lessons/" + lessonId + ".md";
  var r;
  try {
    r = await fetch(url, { cache: "no-cache" });
  } catch (e) {
    renderStub();
    return;
  }
  if (!r.ok) {
    renderStub();
    return;
  }
  var text = await r.text();
  var parsed = parseFrontmatter(text);
  var meta = parsed.meta;
  var fences = extractFences(parsed.body);

  document.title = (meta.title || lessonId) + " · learnc";
  document.getElementById("lesson-title").textContent = meta.title || lessonId;
  document.getElementById("lesson-label").textContent = meta.label || meta.id || lessonId;

  // Render prose markdown
  /* global marked */
  var prose = document.getElementById("lesson-prose");
  if (typeof marked !== "undefined") {
    marked.setOptions({ headerIds: false, mangle: false });
    prose.innerHTML = marked.parse(fences.body);
  } else {
    prose.innerHTML = "<pre>" + escapeHTML(fences.body) + "</pre>";
  }
  addCopyButtons(prose);

  if (fences.starter !== null) {
    setupRunner(fences.starter, fences.expected);
  }

  setupNav(meta);

  // Resolve chapter context for the breadcrumb (best effort; degrades silently).
  getManifest().then(function (manifest) {
    var ch = findChapter(manifest, lessonId);
    if (!ch) return;
    var crumb = document.getElementById("lesson-chapter-crumb");
    if (!crumb) return;
    crumb.innerHTML = " / <span class=\"muted\">Ch " + ch.n + ". " +
      escapeHTML(ch.title) + "</span>";
  });
}

loadLesson().catch(function (err) {
  document.getElementById("lesson-prose").innerHTML =
    '<p class="terminal-error">Error loading lesson: ' + escapeHTML(err && err.message || err) + "</p>";
});
