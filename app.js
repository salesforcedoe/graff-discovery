(function () {
  const STORAGE_KEY = "graff-discovery-v1";
  const SAVE_DEBOUNCE_MS = 400;

  const state = loadState();
  let saveTimer = null;

  document.addEventListener("DOMContentLoaded", () => {
    renderQuestions();
    renderLogistics();
    hydrateInputs();
    bindInputs();
    bindButtons();
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState() {
    setStatus("Saving…", "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setStatus("Saved", "saved");
      } catch (e) {
        setStatus("Storage full", "error");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function setStatus(text, kind) {
    const el = document.getElementById("save-status");
    if (!el) return;
    el.textContent = text;
    el.className = "save-status " + (kind || "");
  }

  function renderQuestions() {
    document.querySelectorAll(".qlist[data-section]").forEach((ol) => {
      const section = ol.dataset.section;
      const questions = window.GRAFF_DATA[section] || [];
      ol.innerHTML = questions
        .map((q, i) => {
          const key = `${section}-q${i + 1}`;
          return `
            <li>
              <div class="q-body">
                <div class="q-text">${escapeHtml(q)}</div>
                <textarea data-key="${key}" placeholder="Notes, quotes, time/dollar figures…"></textarea>
              </div>
            </li>
          `;
        })
        .join("");
    });
  }

  function renderLogistics() {
    const ul = document.querySelector('.checklist[data-section="logistics"]');
    if (!ul) return;
    const items = window.GRAFF_DATA.logistics || [];
    ul.innerHTML = items
      .map((item, i) => {
        const key = `logistics-${i + 1}`;
        return `
          <li>
            <input type="checkbox" id="${key}" data-key="${key}">
            <label for="${key}">${escapeHtml(item)}</label>
          </li>
        `;
      })
      .join("");
  }

  function hydrateInputs() {
    document.querySelectorAll("textarea[data-key]").forEach((ta) => {
      const v = state[ta.dataset.key];
      if (v) {
        ta.value = v;
        ta.classList.add("has-content");
      }
    });
    document.querySelectorAll('input[type="checkbox"][data-key]').forEach((cb) => {
      cb.checked = !!state[cb.dataset.key];
    });
  }

  function bindInputs() {
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.tagName === "TEXTAREA" && t.dataset.key) {
        state[t.dataset.key] = t.value;
        t.classList.toggle("has-content", t.value.trim().length > 0);
        saveState();
      }
    });
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t.type === "checkbox" && t.dataset.key) {
        state[t.dataset.key] = t.checked;
        saveState();
      }
    });
  }

  function bindButtons() {
    document.getElementById("export-btn").addEventListener("click", exportMarkdown);
    document.getElementById("clear-btn").addEventListener("click", clearAll);
  }

  function exportMarkdown() {
    const lines = [];
    const date = new Date().toISOString().slice(0, 10);
    lines.push("# Graff Dealership Visit — Discovery Notes");
    lines.push("");
    lines.push(`**Visit date:** Tuesday, June 9, 2026`);
    lines.push(`**Notes exported:** ${date}`);
    lines.push("");

    const order = [
      "cross-cutting",
      "persona-1",
      "persona-2",
      "persona-3",
      "persona-4",
      "persona-5",
      "persona-6",
      "persona-7",
      "persona-8"
    ];

    order.forEach((section) => {
      const label = window.GRAFF_PERSONA_LABELS[section] || section;
      const questions = window.GRAFF_DATA[section] || [];
      lines.push(`## ${label}`);
      lines.push("");
      questions.forEach((q, i) => {
        const key = `${section}-q${i + 1}`;
        const note = (state[key] || "").trim();
        lines.push(`**Q${i + 1}.** ${q}`);
        lines.push("");
        lines.push(note ? note : "_(no notes)_");
        lines.push("");
      });
      const free = (state[`freeform-${section}`] || "").trim();
      if (free) {
        lines.push(`### Free-form notes`);
        lines.push("");
        lines.push(free);
        lines.push("");
      }
    });

    const themesNotes = (state["freeform-themes"] || "").trim();
    if (themesNotes) {
      lines.push(`## ${window.GRAFF_PERSONA_LABELS["themes"]}`);
      lines.push("");
      lines.push(themesNotes);
      lines.push("");
    }

    lines.push(`## ${window.GRAFF_PERSONA_LABELS["logistics"]}`);
    lines.push("");
    (window.GRAFF_DATA.logistics || []).forEach((item, i) => {
      const key = `logistics-${i + 1}`;
      const checked = state[key] ? "x" : " ";
      lines.push(`- [${checked}] ${item}`);
    });
    lines.push("");

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `graff-visit-notes-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    const ok = confirm("Clear all notes from this browser? This cannot be undone. Export first if you want a copy.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(state).forEach((k) => delete state[k]);
    document.querySelectorAll("textarea[data-key]").forEach((ta) => {
      ta.value = "";
      ta.classList.remove("has-content");
    });
    document.querySelectorAll('input[type="checkbox"][data-key]').forEach((cb) => {
      cb.checked = false;
    });
    setStatus("Cleared", "saved");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
