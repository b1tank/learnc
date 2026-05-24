// learnc — shortcuts.js
// Tiny keyboard-shortcut help overlay. Press `?` to open, Esc to close.
// Items are passed in by each page so the list matches what actually works
// (the landing page has fewer shortcuts than a lesson page).

export function mountHelp(items) {
	if (!items || !items.length) return;
	if (document.getElementById("shortcut-help")) return; // already mounted

	var overlay = document.createElement("div");
	overlay.id = "shortcut-help";
	overlay.className = "shortcut-help";
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");
	overlay.setAttribute("aria-label", "Keyboard shortcuts");
	overlay.hidden = true;

	var panel = document.createElement("div");
	panel.className = "shortcut-help-panel";

	var h = document.createElement("h2");
	h.textContent = "Keyboard shortcuts";
	panel.appendChild(h);

	var dl = document.createElement("dl");
	items.forEach(function (it) {
		var dt = document.createElement("dt");
		// Render each key inside <kbd>; allow "Ctrl+Enter" style combos.
		it.keys.forEach(function (k, i) {
			if (i > 0) {
				var sep = document.createElement("span");
				sep.className = "kbd-sep";
				sep.textContent = " · ";
				dt.appendChild(sep);
			}
			var parts = k.split("+");
			parts.forEach(function (p, j) {
				if (j > 0) dt.appendChild(document.createTextNode("+"));
				var kbd = document.createElement("kbd");
				kbd.textContent = p;
				dt.appendChild(kbd);
			});
		});
		var dd = document.createElement("dd");
		dd.textContent = it.label;
		dl.appendChild(dt);
		dl.appendChild(dd);
	});
	panel.appendChild(dl);

	var hint = document.createElement("p");
	hint.className = "shortcut-help-hint";
	hint.textContent = "Esc or click anywhere outside to close.";
	panel.appendChild(hint);

	overlay.appendChild(panel);
	document.body.appendChild(overlay);

	function open() {
		overlay.hidden = false;
		// Move focus into the panel for screen readers; let Tab cycle inside.
		panel.tabIndex = -1;
		panel.focus();
	}
	function close() {
		overlay.hidden = true;
	}
	overlay.addEventListener("click", function (e) {
		if (e.target === overlay) close();
	});

	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape" && !overlay.hidden) {
			e.preventDefault();
			close();
			return;
		}
		// "?" opens help — but only when the user isn't typing somewhere.
		// Shift+/ produces "?" on US layouts; we check e.key directly so
		// other layouts still work.
		if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
			var t = e.target;
			if (t && t.closest) {
				if (t.closest(".cm-editor")) return;
				var tag = t.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
			}
			e.preventDefault();
			if (overlay.hidden) open(); else close();
		}
	});
}
