// learnc — theme.js
// Three-state theme switch: auto / light / dark.
//
// "auto" follows the OS via prefers-color-scheme.
// "light" / "dark" pin the page regardless of OS.
//
// The HEAD of every page runs a tiny inline boot script that sets
// document.documentElement.dataset.theme to "dark" before paint when needed
// (avoiding a flash of the wrong theme). That same attribute is what CSS
// keys off — see :root[data-theme="dark"] in style.css.
//
// This module is loaded from app.js (landing) and lesson.js (lesson) AFTER
// DOM ready. It mounts the toggle button and keeps the editor + the
// attribute in sync as the user cycles.

var STORAGE_KEY = "learnc.theme";
var STATES = ["auto", "light", "dark"];
var LABELS = { auto: "◐ auto", light: "☀ light", dark: "☾ dark" };

export function currentPref() {
	var v = null;
	try { v = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
	if (v === "light" || v === "dark") return v;
	return "auto";
}

export function isDark() {
	var pref = currentPref();
	if (pref === "dark") return true;
	if (pref === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Apply a state: persist, set [data-theme] for CSS, and fire an event so
// other modules (the CodeMirror editor) can react.
function applyState(state) {
	try {
		if (state === "auto") localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, state);
	} catch (e) { /* private mode — best effort */ }

	var html = document.documentElement;
	var dark = state === "dark" || (state === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	if (dark) html.dataset.theme = "dark";
	else delete html.dataset.theme;

	document.dispatchEvent(new CustomEvent("learnc:theme", {
		detail: { pref: state, isDark: dark }
	}));
}

export function mountToggle(container) {
	if (!container) return;
	var btn = document.createElement("button");
	btn.type = "button";
	btn.className = "theme-toggle";
	btn.id = "theme-toggle";

	function render(state) {
		btn.textContent = LABELS[state];
		btn.setAttribute("aria-label", "theme: " + state + " (click to cycle)");
		btn.title = "theme: " + state + " — click to cycle (auto → light → dark)";
	}

	btn.addEventListener("click", function () {
		var i = STATES.indexOf(currentPref());
		var next = STATES[(i + 1) % STATES.length];
		applyState(next);
		render(next);
	});

	render(currentPref());
	container.appendChild(btn);

	// If the user is on "auto", reflect OS theme changes in real time.
	var mq = window.matchMedia("(prefers-color-scheme: dark)");
	function onMqChange() {
		if (currentPref() === "auto") applyState("auto");
	}
	if (mq.addEventListener) mq.addEventListener("change", onMqChange);
	else if (mq.addListener) mq.addListener(onMqChange); // Safari < 14
}
