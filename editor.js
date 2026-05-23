// learnc — editor.js
// CodeMirror 6. We use BARE specifiers ("codemirror", "@codemirror/state", ...)
// which resolve through the <script type="importmap"> in lesson.html. That map
// pins every submodule to a single URL so they share the same @codemirror/state
// instance (otherwise extension instanceof checks fail).

import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

export function mountEditor(root, initialCode, onChange) {
  // Clear any placeholder content (e.g. "Loading…")
  while (root.firstChild) root.removeChild(root.firstChild);

  var state = EditorState.create({
    doc: initialCode || "",
    extensions: [
      basicSetup,
      cpp(),
      keymap.of([indentWithTab]),
      EditorView.updateListener.of(function (update) {
        if (update.docChanged && onChange) {
          try { onChange(update.state.doc.toString()); } catch (e) { /* swallow */ }
        }
      })
    ]
  });

  var view = new EditorView({ state: state, parent: root });

  return {
    getValue: function () { return view.state.doc.toString(); },
    setValue: function (v) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: v || "" }
      });
    },
    focus: function () { view.focus(); }
  };
}
