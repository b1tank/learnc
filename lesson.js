// learnc - lesson.js
// Renders an individual lesson: fetches the .md file, parses frontmatter,
// extracts starter/expected code, wires up the editor + Run button.

import { mountEditor } from "./editor.js";
import { run as runC, onProgress as runOnProgress } from "./runner.js";
import { mountToggle as mountThemeToggle } from "./theme.js";
import { mountHelp as mountShortcuts } from "./shortcuts.js";

var params = new URLSearchParams(location.search);
var lessonId = params.get("id");
// Guard: lesson ids are flat slugs (letters/digits/hyphens). Anything else
// is either a typo or a probe - refuse to feed it into fetch URLs, github
// links, or storage keys. Path-traversal style ids would otherwise resolve
// against the static site root.
if (lessonId !== null && !/^[A-Za-z0-9_-]+$/.test(lessonId)) {
  lessonId = null;
}

// Course routing. ?course=<slug> picks which course directory we read from.
// Default "kr" keeps every pre-multi-course URL (lesson.html?id=...) working
// without changes. All courses live in parallel under courses/<slug>/.
var courseId = params.get("course") || "kr";
if (!/^[a-z][a-z0-9-]{0,31}$/.test(courseId)) courseId = "kr";

function courseLessonsDir() {
  return "courses/" + courseId + "/lessons";
}
function courseManifestUrl() {
  return "courses/" + courseId + "/manifest.json";
}
function courseIndexHref() {
  // Each course gets a sibling top-level HTML page (kr.html, antirez.html).
  // Keeping the entry points at the root means short bookmarkable URLs and
  // keeps GitHub Pages happy without per-course rewrite rules.
  return courseId + ".html";
}
function lessonHref(id) {
  // Only emit ?course= for non-kr so K&R bookmarks stay byte-identical.
  return courseId === "kr"
    ? "lesson.html?id=" + encodeURIComponent(id)
    : "lesson.html?course=" + encodeURIComponent(courseId) +
        "&id=" + encodeURIComponent(id);
}

var GITHUB_BLOB_BASE = "https://github.com/b1tank/learnc/blob/main/" +
  courseLessonsDir() + "/";
var GITHUB_NEW_BASE = "https://github.com/b1tank/learnc/new/main/" +
  courseLessonsDir();

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
  manifestPromise = fetch(courseManifestUrl())
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
// expected output (```output```). Only the FIRST output fence is consumed -
// and only when a starter exists - so that lessons built on the newer inline
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
  // Match one `c:run` fence, then an OPTIONAL `stdin` fence and an OPTIONAL
  // `output` fence (in that order) right after it. Both must be optional
  // *within a single alternative*: with separate alternatives the code body's
  // non-greedy `[\s\S]*?` backtracks across its own closing fence to reach a
  // later block's fence, swallowing the block in between. Anchoring the code
  // close to `\n``` ` and making the trailing groups optional keeps each block
  // self-contained.
  var re = /```c:run([^\n]*)\r?\n([\s\S]*?)\r?\n```[ \t]*(?:(?:[ \t]*\r?\n)+```stdin[^\n]*\r?\n([\s\S]*?)\r?\n```[ \t]*)?(?:(?:[ \t]*\r?\n)+```output[^\n]*\r?\n([\s\S]*?)\r?\n```)?/g;
  var body = markdown.replace(re, function (whole, title, code, stdin, out) {
    title = (title || "").trim();
    code = (code || "").replace(/\r?\n$/, "");
    var input = stdin != null ? stdin.replace(/\r?\n$/, "") + "\n" : null;
    var expected = out != null ? out.replace(/\r?\n$/, "") : null;
    var idx = blocks.length;
    blocks.push({ title: title, code: code, stdin: input, expected: expected });
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
  // K&R keys stay as "learnc:code:<id>" so existing learners don't lose
  // their in-progress code; non-kr courses get namespaced to prevent any
  // theoretical collision between slugs across courses.
  return courseId === "kr"
    ? "learnc:code:" + lessonId
    : "learnc:code:" + courseId + ":" + lessonId;
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
      el("code", {}, [courseLessonsDir() + "/" + lessonId + ".md"]),
      " on GitHub"
    ]),
    " using ",
    el("a", { href: "https://github.com/b1tank/learnc/blob/main/" + courseLessonsDir() + "/_template.md" },
      ["the lesson template"]),
    "."
  ]);
  prose.appendChild(notice);

  var pointer = el("p", { class: "muted small" }, [
    "The site loads lessons from markdown files in the ",
    el("a", { href: "https://github.com/b1tank/learnc/tree/main/" + courseLessonsDir() },
      [courseLessonsDir() + "/"]),
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
    prev.href = lessonHref(meta.prev);
    prev.classList.remove("disabled");
  }
  if (meta.next) {
    next.href = lessonHref(meta.next);
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
      location.href = lessonHref(meta.prev);
    } else if (e.key === "ArrowRight" && meta.next) {
      e.preventDefault();
      location.href = lessonHref(meta.next);
    }
  });
}

// Decorate every <pre> in the prose with a small "copy" button. The editor
// (CodeMirror) and the terminal already have their own buttons; only the
// inert markdown code blocks need this.
//
// We wrap each <pre> in a .codeblock container and put the button in a
// .codeblock-header strip ABOVE the <pre> rather than overlaying its
// top-right corner. Earlier the button sat inside the <pre> and long
// lines rendered behind it: overflow:auto clips text at the padding-box
// edge, not the content-edge, so padding-right on <pre> can't keep text
// out from under an absolutely-positioned child. A separate header row
// is the only layout that genuinely avoids occlusion.
function addCopyButtons(root) {
  if (!root) return;
  var pres = root.querySelectorAll("pre");
  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    if (pre.parentNode && pre.parentNode.classList && pre.parentNode.classList.contains("codeblock")) {
      continue; // idempotent - don't double-wrap on re-render
    }
    var wrap = document.createElement("div");
    wrap.className = "codeblock";
    var header = document.createElement("div");
    header.className = "codeblock-header";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "copy";
    btn.setAttribute("aria-label", "copy code to clipboard");
    header.appendChild(btn);
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(header);
    wrap.appendChild(pre);
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
  }
}

// Give each heading a stable slug `id` and a clickable anchor link, so
// sections are deep-linkable (lesson.html?id=...#reading-the-manual). marked
// runs with headerIds disabled (it would otherwise mangle our backtick
// timestamps), so we do it here where we control the slug rules.
function addHeadingAnchors(root) {
  if (!root) return;
  var used = Object.create(null);
  var heads = root.querySelectorAll("h2, h3, h4");
  for (var i = 0; i < heads.length; i++) {
    var h = heads[i];
    if (h.querySelector(".heading-anchor")) continue; // idempotent
    // Build the slug from the heading's plain text only, ignoring inline
    // <code> children - those hold the `[mm:ss]` timestamp tags we don't
    // want in the URL fragment.
    var slugText = "";
    for (var c = 0; c < h.childNodes.length; c++) {
      var node = h.childNodes[c];
      if (node.nodeType === 3) slugText += node.nodeValue;        // text node
      else if (node.nodeName !== "CODE") slugText += node.textContent || "";
    }
    var slug = slugify(slugText);
    if (!slug) slug = "section";
    // De-duplicate collisions: foo, foo-1, foo-2, ...
    if (used[slug]) {
      var n = used[slug]++;
      slug = slug + "-" + n;
    } else {
      used[slug] = 1;
    }
    h.id = slug;
    // Canonical MkDocs/Material-style permalink: a small `#` at the END of
    // the heading that fades in on hover. Only the symbol is the link; the
    // heading text stays plain.
    var a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = "#" + slug;
    a.setAttribute("aria-label", "Permalink to this section");
    a.textContent = "#";
    h.appendChild(a);
  }
}

// Slugify heading text into a URL fragment: lowercase, drop punctuation,
// collapse whitespace to hyphens.
function slugify(text) {
  return String(text)
    .replace(/[\u2192]/g, " ")          // arrows
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")        // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, "");            // trim leading/trailing hyphens
}

// After prose is in the DOM, honour any #fragment in the URL by scrolling
// the matching heading into view (the browser won't do this itself because
// the element didn't exist at initial load).
function scrollToHash() {
  if (!location.hash) return;
  var id = decodeURIComponent(location.hash.slice(1));
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return;
  var el = document.getElementById(id);
  if (el) el.scrollIntoView();
}

// Plain text of a heading, excluding the trailing `#` permalink and the
// inline `[mm:ss]` timestamp <code> tag - used as the TOC label.
function headingText(h) {
  var s = "";
  for (var i = 0; i < h.childNodes.length; i++) {
    var node = h.childNodes[i];
    if (node.nodeType === 3) { s += node.nodeValue; continue; }
    if (node.nodeName === "CODE") continue;
    if (node.classList && node.classList.contains("heading-anchor")) continue;
    s += node.textContent || "";
  }
  return s.trim();
}

// Right rail: an "on this page" list of the lesson's own headings, with a
// scroll-spy that highlights the section currently in view (FastAPI-style).
function renderPageToc(prose) {
  var nav = document.getElementById("page-toc");
  if (!nav) return;
  nav.innerHTML = "";
  var heads = prose.querySelectorAll("h2[id], h3[id]");
  if (!heads.length) { nav.hidden = true; return; }
  nav.hidden = false;

  var title = document.createElement("div");
  title.className = "toc-title";
  title.textContent = "On this page";
  nav.appendChild(title);

  var ul = document.createElement("ul");
  ul.className = "page-toc-list";
  for (var i = 0; i < heads.length; i++) {
    var h = heads[i];
    var li = document.createElement("li");
    li.className = "page-toc-" + h.tagName.toLowerCase();
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = headingText(h);
    a.setAttribute("data-target", h.id);
    li.appendChild(a);
    ul.appendChild(li);
  }
  nav.appendChild(ul);
  setupScrollSpy(prose, nav);

  // On mobile the page TOC is reachable through a header toggle; reveal it
  // now that we know the lesson actually has sections.
  var pageToggle = document.getElementById("page-toc-toggle");
  if (pageToggle) pageToggle.hidden = false;
}

// Highlight the topmost heading scrolled into the upper part of the viewport.
function setupScrollSpy(prose, nav) {
  var heads = prose.querySelectorAll("h2[id], h3[id]");
  var links = nav.querySelectorAll("a[data-target]");
  if (!heads.length || !links.length || !("IntersectionObserver" in window)) return;

  var visible = Object.create(null);
  function highlight() {
    var activeId = null;
    for (var i = 0; i < heads.length; i++) {
      if (visible[heads[i].id]) { activeId = heads[i].id; break; }
    }
    // Fall back to the last heading scrolled above the fold if none qualifies.
    if (!activeId) {
      for (var j = heads.length - 1; j >= 0; j--) {
        if (heads[j].getBoundingClientRect().top < 120) { activeId = heads[j].id; break; }
      }
    }
    for (var k = 0; k < links.length; k++) {
      links[k].classList.toggle("active", links[k].getAttribute("data-target") === activeId);
    }
  }
  var obs = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var id = entries[i].target.id;
      if (entries[i].isIntersecting) visible[id] = true; else delete visible[id];
    }
    highlight();
  }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
  for (var n = 0; n < heads.length; n++) obs.observe(heads[n]);
  highlight();
}

// Left rail: the whole-course outline as a collapsible tree. Each chapter is
// an expandable node (expanded by default); the chapter containing the current
// lesson is highlighted and forced open. Every lesson is a link.
function renderCourseToc(manifest) {
  var root = document.getElementById("course-toc");
  if (!root || !manifest || !manifest.chapters) return;
  root.innerHTML = "";

  var title = document.createElement("div");
  title.className = "toc-title";
  title.textContent = "Contents";
  root.appendChild(title);

  manifest.chapters.forEach(function (ch) {
    var sections = (ch.items || []).filter(function (it) { return it.kind === "section"; });
    if (!sections.length) return;

    var isCurrentChapter = sections.some(function (it) { return it.id === lessonId; });

    var group = document.createElement("div");
    group.className = "course-toc-group" + (isCurrentChapter ? " current-chapter" : "");

    // Chapter row is a button so the whole row toggles the subtree and is
    // keyboard-operable. Default expanded; nothing starts collapsed.
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "course-toc-chapter";
    btn.setAttribute("aria-expanded", "true");
    var caret = document.createElement("span");
    caret.className = "course-toc-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.textContent = "\u25be"; // ▾
    var label = document.createElement("span");
    label.className = "course-toc-chapter-label";
    label.textContent = ch.n + ". " + ch.title;
    btn.appendChild(caret);
    btn.appendChild(label);

    var ul = document.createElement("ul");
    ul.className = "course-toc-list";
    sections.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = lessonHref(item.id);
      a.textContent = (item.label ? item.label + " " : "") + (item.title || item.id);
      if (item.id === lessonId) {
        a.className = "current";
        a.setAttribute("aria-current", "page");
        li.className = "current";
      }
      li.appendChild(a);
      ul.appendChild(li);
    });

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      group.classList.toggle("collapsed", open);
    });

    group.appendChild(btn);
    group.appendChild(ul);
    root.appendChild(group);
  });

  // Bring the current lesson into view within the sidebar without scrolling
  // the whole window.
  var cur = root.querySelector("a.current");
  if (cur) {
    var cRect = root.getBoundingClientRect();
    var eRect = cur.getBoundingClientRect();
    root.scrollTop += (eRect.top - cRect.top) - root.clientHeight / 2 + eRect.height / 2;
  }
}

// On narrow screens the two sidebars collapse into slide-in drawers opened
// from header toggles. One backdrop serves both; Escape, a backdrop tap, or
// following any link closes whatever is open. Idempotent - safe to call once.
function setupTocDrawers() {
  var backdrop = document.getElementById("toc-backdrop");
  var courseToggle = document.getElementById("toc-toggle");
  var pageToggle = document.getElementById("page-toc-toggle");
  var courseToc = document.getElementById("course-toc");
  var pageToc = document.getElementById("page-toc");
  if (!backdrop) return;

  function close() {
    document.body.classList.remove("toc-open", "page-toc-open");
    backdrop.hidden = true;
    if (courseToggle) courseToggle.setAttribute("aria-expanded", "false");
    if (pageToggle) pageToggle.setAttribute("aria-expanded", "false");
  }
  function open(which) {
    var isCourse = which === "course";
    document.body.classList.toggle("toc-open", isCourse);
    document.body.classList.toggle("page-toc-open", !isCourse);
    backdrop.hidden = false;
    if (courseToggle) courseToggle.setAttribute("aria-expanded", String(isCourse));
    if (pageToggle) pageToggle.setAttribute("aria-expanded", String(!isCourse));
  }

  if (courseToggle) courseToggle.addEventListener("click", function () {
    if (document.body.classList.contains("toc-open")) close(); else open("course");
  });
  if (pageToggle) pageToggle.addEventListener("click", function () {
    if (document.body.classList.contains("page-toc-open")) close(); else open("page");
  });
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
  // Tapping any link inside a drawer navigates and should dismiss it.
  if (courseToc) courseToc.addEventListener("click", function (e) {
    if (e.target.closest("a")) close();
  });
  if (pageToc) pageToc.addEventListener("click", function (e) {
    if (e.target.closest("a")) close();
  });
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
      "https://b1tank.github.io/learnc/ instead - the COOP/COEP " +
      "service worker only registers over HTTPS.\n" +
      "if you're on localhost, try a hard refresh."
    ) +
    "</span>";
  return false;
}

// Compile + run `code`, streaming progress into `termEl` and final output
// into termEl/badgeEl. `btn` is disabled for the duration. `stdin` (optional)
// is fed to the program. Self-contained so inline blocks and the bottom runner
// share one code path.
async function compileAndRun(code, termEl, badgeEl, expected, btn, stdin) {
  if (!ensureCrossOriginIsolated(termEl)) return;
  termEl.innerHTML = '<span class="terminal-empty">compiling and running\u2026</span>';
  if (badgeEl) badgeEl.textContent = "";
  if (btn) btn.disabled = true;
  runOnProgress(function (msg) {
    termEl.innerHTML = '<span class="terminal-empty">' + escapeHTML(msg) + "</span>";
  });
  try {
    var result = await runC(code, stdin || "");
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
  var resetBtn = el("button", { type: "button", class: "ghost",
    title: "Restore the original code" }, ["reset"]);
  bar.appendChild(resetBtn);
  var shareBtn = el("button", { type: "button", class: "ghost",
    title: "Copy this snippet to the clipboard" }, ["share"]);
  bar.appendChild(shareBtn);
  var runBtn = el("button", { type: "button", class: "primary" }, ["run"]);
  bar.appendChild(runBtn);
  root.appendChild(bar);

  var editorHost = el("div", { class: "editor" }, []);
  root.appendChild(editorHost);

  // Optional stdin panel: shows exactly what bytes are piped to the program so
  // the learner can see the input that produced the output. Read-only - the
  // point is reproducibility, not an interactive console.
  if (block.stdin != null) {
    var stdinWrap = el("div", { class: "runner-stdin" }, []);
    stdinWrap.appendChild(el("span", { class: "runner-stdin-label" }, ["stdin"]));
    stdinWrap.appendChild(el("pre", {}, [block.stdin]));
    root.appendChild(stdinWrap);
  }

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
    compileAndRun(api.getValue(), term, badge, block.expected, runBtn, block.stdin);
  });

  // Reset restores the original code shipped with the lesson. No confirm
  // prompt: inline drafts aren't persisted, so a stray click costs nothing.
  resetBtn.addEventListener("click", function () {
    api.setValue(block.code);
    api.focus();
  });

  // Share copies the *current* editor contents to the clipboard. Inline blocks
  // aren't tied to a URL (a page has many), so a copy-the-code share is the
  // unambiguous, link-rot-free thing to hand to someone else.
  shareBtn.addEventListener("click", function () {
    var code = api.getValue();
    var orig = shareBtn.textContent;
    var done = function () {
      shareBtn.textContent = "copied!";
      setTimeout(function () { shareBtn.textContent = orig; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () {
        prompt("Copy this code:", code);
      });
    } else {
      prompt("Copy this code:", code);
    }
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
  // Debounce the localStorage writes - every keystroke fires onChange, and
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
      '<p>Pick a lesson from the <a href="' + courseIndexHref() + '">index</a>.</p>';
    document.getElementById("runner-container").hidden = true;
    return;
  }

  document.getElementById("edit-link").href = GITHUB_BLOB_BASE + lessonId + ".md";

  // Point the "all lessons" affordances (header logo + lessons icon) at the
  // current course's index page so K&R lessons go back to kr.html and
  // antirez lessons go back to antirez.html.
  var indexHref = courseIndexHref();
  var headerLink = document.querySelector(".site-header h1 a");
  if (headerLink) headerLink.setAttribute("href", indexHref);
  var lessonsNavLink = document.querySelector('.site-header a[aria-label="all lessons"]');
  if (lessonsNavLink) lessonsNavLink.setAttribute("href", indexHref);
  var crumbsHome = document.querySelector("#crumbs a");
  if (crumbsHome) crumbsHome.setAttribute("href", indexHref);

  // Kick off the manifest fetch in parallel with the lesson fetch - both are
  // needed to populate the breadcrumb without a visible flash.
  var manifestPromise = getManifest().catch(function () { return null; });

  var url = courseLessonsDir() + "/" + lessonId + ".md";
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
  addHeadingAnchors(prose);
  renderPageToc(prose);
  mountInlineRunnables(prose, runnables.blocks);

  if (fences.starter !== null) {
    setupRunner(fences.starter, fences.expected);
  }

  setupNav(meta);

  await renderCrumbs(manifestPromise, meta);
  getManifest().then(function (m) { if (m) renderCourseToc(m); });
  setupTocDrawers();
  scrollToHash();
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
