// v0.1 Step A
// App shell only: UI wiring, theme toggle, and placeholder feedback.

(function () {
  "use strict";

  const APP_VERSION = "v0.1 Step A";
  const STORAGE_KEYS = {
    theme: "notes_pwa_theme"
  };

  const els = {
    themeToggle: document.getElementById("themeToggle"),
    searchInput: document.getElementById("searchInput"),
    newNoteBtn: document.getElementById("newNoteBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    backupBtn: document.getElementById("backupBtn"),
    titleInput: document.getElementById("titleInput"),
    contentInput: document.getElementById("contentInput"),
    toast: document.getElementById("toast")
  };

  let toastTimer = null;

  function showToast(message) {
    if (!els.toast) return;

    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 1600);
  }

  function safeGetLocalStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getPreferredTheme() {
    const saved = safeGetLocalStorage(STORAGE_KEYS.theme);
    if (saved === "light" || saved === "dark") return saved;

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    return prefersDark ? "dark" : "light";
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", normalized);

    if (els.themeToggle) {
      const pressed = normalized === "dark";
      els.themeToggle.setAttribute("aria-pressed", String(pressed));
      els.themeToggle.textContent = pressed ? "Dark" : "Light";
      els.themeToggle.title = "Toggle theme";
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";

    applyTheme(next);

    const ok = safeSetLocalStorage(STORAGE_KEYS.theme, next);
    if (!ok) {
      showToast("Theme changed, but could not save preference");
      return;
    }

    showToast(`Theme: ${next}`);
  }

  function wireUI() {
    if (els.themeToggle) {
      els.themeToggle.addEventListener("click", toggleTheme);
    }

    if (els.newNoteBtn) {
      els.newNoteBtn.addEventListener("click", () => {
        showToast("New: not implemented yet");
      });
    }

    if (els.deleteBtn) {
      els.deleteBtn.addEventListener("click", () => {
        showToast("Delete: not implemented yet");
      });
    }

    if (els.backupBtn) {
      els.backupBtn.addEventListener("click", () => {
        showToast("Backup: not implemented yet");
      });
    }

    if (els.searchInput) {
      els.searchInput.addEventListener("focus", () => {
        showToast("Search: not implemented yet");
      });
    }

    // Step A: editor is disabled to avoid implying save behavior.
    if (els.titleInput) els.titleInput.disabled = true;
    if (els.contentInput) els.contentInput.disabled = true;
  }

  function init() {
    applyTheme(getPreferredTheme());
    wireUI();
    showToast(`Loaded ${APP_VERSION}`);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
