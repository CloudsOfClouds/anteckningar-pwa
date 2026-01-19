// v0.1 Step B
// Implements localStorage notes: create, list, select, edit (autosave), and sort by last updated.

(function () {
  "use strict";

  const APP_VERSION = "v0.1 Step B";
  const STORAGE_KEYS = {
    theme: "notes_pwa_theme",
    notes: "notes_pwa_notes_v01",
    selectedId: "notes_pwa_selected_id_v01"
  };

  const els = {
    themeToggle: document.getElementById("themeToggle"),
    searchInput: document.getElementById("searchInput"),
    newNoteBtn: document.getElementById("newNoteBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    backupBtn: document.getElementById("backupBtn"),
    notesList: document.getElementById("notesList"),
    emptyState: document.getElementById("emptyState"),
    titleInput: document.getElementById("titleInput"),
    contentInput: document.getElementById("contentInput"),
    editorHint: document.getElementById("editorHint"),
    statusBadge: document.getElementById("statusBadge"),
    statusText: document.getElementById("statusText"),
    toast: document.getElementById("toast")
  };

  let state = {
    notes: [],
    selectedId: null,
    searchQuery: ""
  };

  let toastTimer = null;
  let saveTimer = null;

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
    } catch {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeParseJSON(raw, fallback) {
    try {
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function nowMs() {
    return Date.now();
  }

  function generateId() {
    // Simple unique id, good enough for local app use.
    return `n_${nowMs()}_${Math.random().toString(16).slice(2)}`;
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  // Theme
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
    if (!ok) showToast("Theme changed, but could not save preference");
  }

  // Storage
  function loadFromStorage() {
    const rawNotes = safeGetLocalStorage(STORAGE_KEYS.notes);
    const parsedNotes = safeParseJSON(rawNotes, []);
    const notes = Array.isArray(parsedNotes) ? parsedNotes : [];

    // Minimal validation
    state.notes = notes
      .filter((n) => n && typeof n === "object")
      .map((n) => ({
        id: typeof n.id === "string" ? n.id : generateId(),
        title: typeof n.title === "string" ? n.title : "",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : nowMs(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : nowMs()
      }));

    const storedSelected = safeGetLocalStorage(STORAGE_KEYS.selectedId);
    if (storedSelected && state.notes.some((n) => n.id === storedSelected)) {
      state.selectedId = storedSelected;
    } else {
      state.selectedId = state.notes.length ? state.notes[0].id : null;
    }
  }

  function saveToStorage() {
    const ok = safeSetLocalStorage(STORAGE_KEYS.notes, JSON.stringify(state.notes));
    if (!ok) showToast("Could not save notes to localStorage");
    safeSetLocalStorage(STORAGE_KEYS.selectedId, state.selectedId || "");
  }

  function scheduleSave() {
    // Debounce saves to avoid writing on every keystroke
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveToStorage();
      setStatus("Saved");
    }, 350);
  }

  // Notes actions
  function createNote() {
    const id = generateId();
    const ts = nowMs();

    const note = {
      id,
      title: "",
      content: "",
      createdAt: ts,
      updatedAt: ts
    };

    state.notes.unshift(note);
    state.selectedId = id;
    saveToStorage();

    showToast("New note created");
    render();
    focusEditor();
  }

  function getSelectedNote() {
    if (!state.selectedId) return null;
    return state.notes.find((n) => n.id === state.selectedId) || null;
  }

  function updateSelectedNote(fields) {
    const note = getSelectedNote();
    if (!note) return;

    const nextTitle = typeof fields.title === "string" ? fields.title : note.title;
    const nextContent = typeof fields.content === "string" ? fields.content : note.content;

    note.title = nextTitle;
    note.content = nextContent;
    note.updatedAt = nowMs();

    // Sort: newest updated first
    state.notes.sort((a, b) => b.updatedAt - a.updatedAt);

    setStatus("Saving...");
    scheduleSave();
    renderListOnly();
  }

  // UI rendering
  function clearListItems() {
    const list = els.notesList;
    if (!list) return;

    // Remove everything except emptyState (we keep it in DOM)
    Array.from(list.children).forEach((child) => {
      if (child !== els.emptyState) child.remove();
    });
  }

  function getFilteredNotes() {
    const q = (state.searchQuery || "").trim().toLowerCase();
    if (!q) return state.notes;

    return state.notes.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const c = (n.content || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }

  function renderListOnly() {
    if (!els.notesList) return;

    const notes = getFilteredNotes();
    clearListItems();

    if (els.emptyState) {
      els.emptyState.style.display = state.notes.length === 0 ? "block" : "none";
    }

    notes.forEach((note) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "note-card";
      btn.setAttribute("role", "listitem");
      btn.dataset.id = note.id;

      if (note.id === state.selectedId) {
        btn.classList.add("note-card--active");
      }

      const title = (note.title || "").trim() || "Untitled";
      const snippet = (note.content || "").trim().replace(/\s+/g, " ").slice(0, 80);
      const meta = formatTime(note.updatedAt);

      btn.innerHTML = `
        <div class="note-card__title"></div>
        <div class="note-card__snippet"></div>
        <div class="note-card__meta"></div>
      `;

      btn.querySelector(".note-card__title").textContent = title;
      btn.querySelector(".note-card__snippet").textContent = snippet || " ";
      btn.querySelector(".note-card__meta").textContent = meta;

      btn.addEventListener("click", () => {
        state.selectedId = note.id;
        saveToStorage();
        render();
        focusEditor();
      });

      els.notesList.appendChild(btn);
    });
  }

  function setEditorEnabled(enabled) {
    if (els.titleInput) els.titleInput.disabled = !enabled;
    if (els.contentInput) els.contentInput.disabled = !enabled;
    if (els.deleteBtn) els.deleteBtn.disabled = !enabled;
  }

  function setStatus(text) {
    if (els.statusText) els.statusText.textContent = text;
  }

  function renderEditor() {
    const note = getSelectedNote();

    if (!note) {
      if (els.editorHint) els.editorHint.textContent = "Välj en anteckning, eller skapa ny";
      setEditorEnabled(false);
      if (els.titleInput) els.titleInput.value = "";
      if (els.contentInput) els.contentInput.value = "";
      setStatus("Redo");
      return;
    }

    if (els.editorHint) els.editorHint.textContent = "Autosave aktiv";
    setEditorEnabled(true);

    // Prevent cursor jumps by only setting values if different
    if (els.titleInput && els.titleInput.value !== note.title) els.titleInput.value = note.title;
    if (els.contentInput && els.contentInput.value !== note.content) els.contentInput.value = note.content;

    setStatus("Redo");
  }

  function render() {
    renderListOnly();
    renderEditor();
  }

  function focusEditor() {
    // If title is empty, focus title; else focus content
    const note = getSelectedNote();
    if (!note) return;

    const titleEmpty = !note.title || !note.title.trim();
    const target = titleEmpty ? els.titleInput : els.contentInput;
    if (target && !target.disabled) {
      target.focus();
    }
  }

  // Wiring
  function wireUI() {
    if (els.themeToggle) {
      els.themeToggle.addEventListener("click", toggleTheme);
    }

    if (els.newNoteBtn) {
      els.newNoteBtn.addEventListener("click", createNote);
    }

    if (els.backupBtn) {
      els.backupBtn.addEventListener("click", () => {
        showToast("Backup: not implemented yet");
      });
    }

    if (els.deleteBtn) {
      els.deleteBtn.addEventListener("click", () => {
        showToast("Delete: not implemented yet");
      });
    }

    if (els.searchInput) {
      els.searchInput.addEventListener("input", (e) => {
        state.searchQuery = String(e.target.value || "");
        renderListOnly();
      });
    }

    if (els.titleInput) {
      els.titleInput.addEventListener("input", (e) => {
        updateSelectedNote({ title: String(e.target.value || "") });
      });
    }

    if (els.contentInput) {
      els.contentInput.addEventListener("input", (e) => {
        updateSelectedNote({ content: String(e.target.value || "") });
      });
    }
  }

  function init() {
    applyTheme(getPreferredTheme());
    loadFromStorage();
    wireUI();
    render();
    showToast(`Loaded ${APP_VERSION}`);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
