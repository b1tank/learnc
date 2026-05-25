// learnc — app.js
// Lesson index renderer (used by index.html only). Loaded as a module, so
// `script type="module"` already implies strict mode and module scope.

import { mountToggle as mountThemeToggle } from "./theme.js";
import { mountHelp as mountShortcuts } from "./shortcuts.js";

var MANIFEST_URL = "lessons/manifest.json";

function el(tag, attrs, children) {
  var e = document.createElement(tag);
  attrs = attrs || {};
  for (var k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
    var v = attrs[k];
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  (children || []).forEach(function (c) {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function lessonURL(id) {
  return "lesson.html?id=" + encodeURIComponent(id);
}

function statusLabel(s) {
  if (s === "done") return { text: "\u2022 done", cls: "status done" };
  if (s === "draft") return { text: "\u2022 draft", cls: "status draft" };
  return { text: "\u2022 stub", cls: "status" };
}

function renderIndex(manifest, root) {
  root.innerHTML = "";
  // Hide stubs by default — the index has hundreds of them and the eye
  // glazes over. Future stub entries stay hidden unless a UI affordance
  // is added back to toggle them; the per-status chips that used to live
  // in this slot were removed once every lesson reached "done".
  root.classList.add("lesson-list--hide-stub");

  manifest.chapters.forEach(function (ch) {
    var sec = el("section", { class: "chapter" });
    sec.appendChild(el("h2", { class: "chapter-head" }, ["Chapter " + ch.n + ". " + ch.title]));
    var ul = el("ul", { class: "lesson-list" });
    ch.items.forEach(function (item) {
      var status = item.status || "stub";
      var li = el("li", { class: "status-" + status });
      var label;
      var title;
      if (item.kind === "exercise") {
        label = "Ex " + item.label;
        title = item.title || ("Exercise " + item.label);
      } else {
        label = item.label;
        title = item.title || item.label;
      }
      li.appendChild(el("span", { class: "lbl" }, [label]));
      li.appendChild(el("a", { href: lessonURL(item.id) }, [title]));
      var st = statusLabel(status);
      li.appendChild(el("span", { class: st.cls }, [st.text]));
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    root.appendChild(sec);
  });
}

function init() {
  var root = document.getElementById("lesson-index");
  if (!root) return;
  mountThemeToggle(document.getElementById("theme-toggle-slot"));
  mountShortcuts([
    { keys: ["?"], label: "show this help" },
    { keys: ["Esc"], label: "close help" }
  ]);
  // `cache: "no-cache"` issues a conditional request (If-None-Match /
  // If-Modified-Since) every page load, so the progress badge always
  // reflects the deployed manifest. The manifest is ~5 KB and fetched
  // exactly once per visit, so the 304 round-trip cost is negligible;
  // staleness, by contrast, is user-visible (the badge counts get stuck
  // for up to 10 min behind GitHub Pages' default `max-age=600`).
  // Lesson pages still use plain fetch — there the manifest only feeds
  // the chapter-title breadcrumb, which is not freshness-sensitive.
  fetch(MANIFEST_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (m) {
      cacheTitleMap(m);
      renderIndex(m, root);
    })
    .catch(function (err) {
      root.innerHTML = '<p class="terminal-error">Could not load lesson manifest: '
        + String(err.message) + ' — <a href="">retry</a></p>';
    });
}

// Persist a slug → display-title map so lesson.html's inline hint script
// can paint the real title at first paint (instead of waiting for lesson.js
// to fetch + parse the manifest). Exercises don't have titles in the
// manifest, so fall back to the label ("Ex 1-1") for consistency with the
// rest of the UI.
function cacheTitleMap(manifest) {
  try {
    var titles = {};
    manifest.chapters.forEach(function (ch) {
      ch.items.forEach(function (it) {
        var t = it.title;
        if (!t && it.kind === "exercise") t = "Exercise " + it.label;
        if (!t) t = it.id;
        titles[it.id] = t;
      });
    });
    localStorage.setItem("learnc.titles", JSON.stringify(titles));
  } catch (e) { /* private mode — paint hint is best-effort */ }
}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", init);
} else {
init();
}
