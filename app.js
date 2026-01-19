// v0.1 UI polish
// UI texts in Swedish, simple list view (title + ISO date), keeps localStorage, delete animation, export backup.

(function () {
  "use strict";

  const APP_VERSION = "v0.1";
  const STORAGE_KEYS = {
    theme: "notes_pwa_theme",
    notes: "notes_pwa_notes_v01",
    selectedId: "notes_pwa_selected_id_v01"
  };

  const DELETE_ANIM_MS = 230;

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
  let isDeleting = false;

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
    return `n_${nowMs()}_${Math.random().toString(16).slice(2)}`;
  }

  function formatDateISO(ts) {
    try {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
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
      els.themeToggle.textContent = pressed ? "Mörkt" : "Ljust";
      els.themeToggle.title = "Växla tema";
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    const ok = safeSetLocalStorage(STORAGE_KEYS.theme, next);
    if (!ok) showToast("Kunde inte spara temat");
  }

  // Storage
  function loadFromStorage() {
    const rawNotes = safeGetLocalStorage(STORAGE_KEYS.notes);
    const parsedNotes = safeParseJSON(rawNotes, []);
    const notes = Array.isArray(parsedNotes) ? parsedNotes : [];

    state.notes = notes
      .filter((n) => n && typeof n === "object")
      .map((n) => ({
        id: typeof n.id === "string" ? n.id : generateId(),
        title: typeof n.title === "string" ? n.title : "",
        content: typeof n.content === "string" ? n.content : "",
        createdAt: typeof n.createdAt === "number" ? n.createdAt : nowMs(),
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : nowMs()
      }));

    state.notes.sort((a, b) => b.updatedAt - a.updatedAt);

    const storedSelected = safeGetLocalStorage(STORAGE_KEYS.selectedId);
    if (storedSelected && state.notes.some((n) => n.id === storedSelected)) {
      state.selectedId = storedSelected;
    } else {
      state.selectedId = state.notes.length ? state.notes[0].id : null;
    }
  }

  function saveToStorage() {
    const ok = safeSetLocalStorage(STORAGE_KEYS.notes, JSON.stringify(state.notes));
    if (!ok) showToast("Kunde inte spara anteckningar");
    safeSetLocalStorage(STORAGE_KEYS.selectedId, state.selectedId || "");
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveToStorage();
      setStatus("Sparad");
    }, 350);
  }

  function setStatus(text) {
    if (els.statusText) els.statusText.textContent = text;
  }

  // Notes actions
  function createNote() {
    if (isDeleting) return;

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

    showToast("Ny anteckning");
    render();
    focusEditor();
  }

  function getSelectedNote() {
    if (!state.selectedId) return null;
    return state.notes.find((n) => n.id === state.selectedId) || null;
  }

  function updateSelectedNote(fields) {
    const note = getSelectedNote();
    if (!note || isDeleting) return;

    const nextTitle = typeof fields.title === "string" ? fields.title : note.title;
    const nextContent = typeof fields.content === "string" ? fields.content : note.content;

    note.title = nextTitle;
    note.content = nextContent;
    note.updatedAt = nowMs();

    state.notes.sort((a, b) => b.updatedAt - a.updatedAt);

    setStatus("Sparar...");
    scheduleSave();
    renderListOnly();
  }

  function pickNextSelectedId(deletedId) {
    const remaining = state.notes.filter((n) => n.id !== deletedId);
    return remaining.length ? remaining[0].id : null;
  }

  function setEditorEnabled(enabled) {
    if (els.titleInput) els.titleInput.disabled = !enabled;
    if (els.contentInput) els.contentInput.disabled = !enabled;
    if (els.deleteBtn) els.deleteBtn.disabled = !enabled;
  }

  function deleteSelectedNote() {
    if (isDeleting) return;

    const note = getSelectedNote();
    if (!note) {
      showToast("Ingen anteckning vald");
      return;
    }

    isDeleting = true;
    setEditorEnabled(false);
    setStatus("Raderar...");

    const id = note.id;

    const listItem = els.notesList
      ? els.notesList.querySelector(`.note-row[data-id="${CSS.escape(id)}"]`)
      : null;

    if (listItem) {
      listItem.classList.add("is-deleting");
      window.requestAnimationFrame(() => {
        listItem.classList.add("is-deleted");
      });
    }

    window.setTimeout(() => {
      state.notes = state.notes.filter((n) => n.id !== id);
      state.selectedId = pickNextSelectedId(id);
      saveToStorage();

      isDeleting = false;
      showToast("Raderad");
      render();
      if (state.selectedId) focusEditor();
    }, DELETE_ANIM_MS);
  }

  // Export
  function buildBackupPayload() {
    return {
      app: "Anteckningar",
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: { notes: state.notes }
    };
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();

    const ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(ta);

    if (!ok) throw new Error("Clipboard copy failed");
  }

  async function runExport() {
    try {
      const payload = buildBackupPayload();
      const json = JSON.stringify(payload, null, 2);
      await copyTextToClipboard(json);
      showToast("Kopierad");
    } catch {
      showToast("Kunde inte kopiera");
      try {
        const payload = buildBackupPayload();
        const json = JSON.stringify(payload, null, 2);
        window.prompt("Kopiera JSON:", json);
      } catch {
        // ignore
      }
    }
  }

  // UI rendering
  function clearListItems() {
    const list = els.notesList;
    if (!list) return;

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
      btn.className = "note-row";
      btn.setAttribute("role", "listitem");
      btn.dataset.id = note.id;

      if (note.id === state.selectedId) {
        btn.classList.add("note-row--active");
      }

      const title = (note.title || "").trim() || "Utan titel";
      const date = formatDateISO(note.updatedAt);

      btn.innerHTML = `
        <div class="note-row__title"></div>
        <div class="note-row__date"></div>
      `;

      btn.querySelector(".note-row__title").textContent = title;
      btn.querySelector(".note-row__date").textContent = date;

      btn.addEventListener("click", () => {
        if (isDeleting) return;
        state.selectedId = note.id;
        saveToStorage();
        render();
        focusEditor();
      });

      els.notesList.appendChild(btn);
    });
  }

  function renderEditor() {
    const note = getSelectedNote();

    if (!note) {
      if (els.editorHint) els.editorHint.textContent = "Autosparas";
      setEditorEnabled(false);
      if (els.titleInput) els.titleInput.value = "";
      if (els.contentInput) els.contentInput.value = "";
      setStatus("Redo");
      return;
    }

    if (els.editorHint) els.editorHint.textContent = "Autosparas";
    setEditorEnabled(true);

    if (els.titleInput && els.titleInput.value !== note.title) els.titleInput.value = note.title;
    if (els.contentInput && els.contentInput.value !== note.content) els.contentInput.value = note.content;

    setStatus("Redo");
  }

  function render() {
    renderListOnly();
    renderEditor();
  }

  function focusEditor() {
    const note = getSelectedNote();
    if (!note) return;

    const titleEmpty = !note.title || !note.title.trim();
    const target = titleEmpty ? els.titleInput : els.contentInput;
    if (target && !target.disabled) target.focus();
  }

  function wireUI() {
    if (els.themeToggle) els.themeToggle.addEventListener("click", toggleTheme);
    if (els.newNoteBtn) els.newNoteBtn.addEventListener("click", createNote);
    if (els.deleteBtn) els.deleteBtn.addEventListener("click", deleteSelectedNote);
    if (els.backupBtn) els.backupBtn.addEventListener("click", runExport);

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
  }

  document.addEventListener("DOMContentLoaded", init);
})();
