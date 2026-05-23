// learnc — app.js
// Shared helpers + lesson index renderer (used by index.html only).
// Plain ES5-ish script (not a module) so it runs anywhere.

(function () {
  "use strict";

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
    manifest.chapters.forEach(function (ch) {
      var sec = el("section", { class: "chapter" });
      sec.appendChild(el("h2", { class: "chapter-head" }, ["Chapter " + ch.n + ". " + ch.title]));
      var ul = el("ul", { class: "lesson-list" });
      ch.items.forEach(function (item) {
        var li = el("li");
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
        var st = statusLabel(item.status);
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
    fetch(MANIFEST_URL, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (m) { renderIndex(m, root); })
      .catch(function (err) {
        root.innerHTML = '<p class="terminal-error">Could not load lesson manifest: '
          + String(err.message) + "</p>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
