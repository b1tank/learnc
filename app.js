// learnc — app.js
// Lesson index renderer (used by index.html only). Loaded as a module, so
// `script type="module"` already implies strict mode and module scope.

import { mountToggle as mountThemeToggle } from "./theme.js";

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
  // glazes over. The chips below let the learner toggle them back on.
  root.classList.add("lesson-list--hide-stub");

  // Progress summary at the top.
  var counts = { done: 0, draft: 0, stub: 0, total: 0 };
  manifest.chapters.forEach(function (ch) {
    ch.items.forEach(function (it) {
      counts.total++;
      var s = it.status || "stub";
      if (counts[s] != null) counts[s]++;
    });
  });
  var pct = counts.total
    ? Math.round((counts.done / counts.total) * 100)
    : 0;
  var summary = el("p", { class: "progress-summary" }, [
    el("strong", {}, [String(counts.done) + " / " + counts.total + " lessons done"]),
    " (" + pct + "%)",
    counts.draft
      ? " \u00b7 " + counts.draft + " in draft"
      : "",
    " \u00b7 " + counts.stub + " stubs left"
  ]);
  root.appendChild(summary);

  // Filter chips. Each chip toggles a class on the root that hides the
  // matching <li>s via CSS. "all" is the master toggle.
  var chips = el("div", { class: "filter-chips", role: "group",
    "aria-label": "filter lessons by status" });
  function makeChip(label, key, on) {
    var b = el("button", { type: "button", class: "chip" + (on ? " on" : ""),
      "data-key": key, "aria-pressed": on ? "true" : "false" }, [label]);
    b.addEventListener("click", function () {
      var pressed = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", pressed ? "false" : "true");
      b.classList.toggle("on", !pressed);
      root.classList.toggle("lesson-list--hide-" + key, pressed);
    });
    return b;
  }
  chips.appendChild(makeChip("done (" + counts.done + ")", "done", true));
  chips.appendChild(makeChip("draft (" + counts.draft + ")", "draft", true));
  chips.appendChild(makeChip("stubs (" + counts.stub + ")", "stub", false));
  root.appendChild(chips);

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
  fetch(MANIFEST_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (m) { renderIndex(m, root); })
    .catch(function (err) {
      root.innerHTML = '<p class="terminal-error">Could not load lesson manifest: '
        + String(err.message) + ' — <a href="">retry</a></p>';
    });
}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", init);
} else {
init();
}
