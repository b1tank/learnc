// learnc - editor.js
// CodeMirror 6. We use BARE specifiers ("codemirror", "@codemirror/state", ...)
// which resolve through the <script type="importmap"> in lesson.html. That map
// pins every submodule to a single URL so they share the same @codemirror/state
// instance (otherwise extension instanceof checks fail).

import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { EditorState, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";

export function mountEditor(root, initialCode, onChange) {
  // Clear any placeholder content (e.g. "Loading…")
  while (root.firstChild) root.removeChild(root.firstChild);

  // Theme lives in a Compartment so we can swap it without rebuilding the
  // whole editor when the user (or the OS) flips dark mode.
  var themeCompartment = new Compartment();
  function themeExt(isDark) { return isDark ? oneDark : []; }

  var state = EditorState.create({
    doc: initialCode || "",
    extensions: [
      basicSetup,
      cpp(),
      keymap.of([indentWithTab]),
      themeCompartment.of(themeExt(isPageDark())),
      EditorView.updateListener.of(function (update) {
        if (update.docChanged && onChange) {
          try { onChange(update.state.doc.toString()); } catch (e) { /* swallow */ }
        }
      })
    ]
  });

  var view = new EditorView({ state: state, parent: root });

  function setDark(isDark) {
    view.dispatch({
      effects: themeCompartment.reconfigure(themeExt(isDark))
    });
  }

  // If the user toggles their OS theme while the page is open, follow it
  // automatically (unless a manual override has been pinned via [data-theme]).
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onMqChange = function () {
    if (!document.documentElement.dataset.theme) setDark(mq.matches);
  };
  if (mq.addEventListener) mq.addEventListener("change", onMqChange);
  else if (mq.addListener) mq.addListener(onMqChange); // Safari < 14

  return {
    getValue: function () { return view.state.doc.toString(); },
    setValue: function (v) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: v || "" }
      });
    },
    focus: function () { view.focus(); },
    setDark: setDark
  };
}

// Resolve "is the page in dark mode right now". The site honors
// prefers-color-scheme by default; round-2 task 2 adds a [data-theme]
// override on <html> that wins over the OS preference. We respect both here
// so the editor follows whichever signal the rest of the page is using.
function isPageDark() {
  var explicit = document.documentElement.dataset.theme;
  if (explicit === "dark") return true;
  if (explicit === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
