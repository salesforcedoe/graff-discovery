(function () {
  const STORAGE_KEY = "graff-discovery-v1";
  const SAVE_DEBOUNCE_MS = 400;

  const state = loadState();
  let saveTimer = null;

  document.addEventListener("DOMContentLoaded", () => {
    renderQuestions();
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

  function hydrateInputs() {
    document.querySelectorAll("textarea[data-key]").forEach((ta) => {
      const v = state[ta.dataset.key];
      if (v) {
        ta.value = v;
        ta.classList.add("has-content");
      }
    });
    document.querySelectorAll('input[type="text"][data-key]').forEach((inp) => {
      const v = state[inp.dataset.key];
      if (v) {
        inp.value = v;
        inp.classList.add("has-content");
      }
    });
  }

  function bindInputs() {
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!t.dataset || !t.dataset.key) return;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text")) {
        state[t.dataset.key] = t.value;
        t.classList.toggle("has-content", t.value.trim().length > 0);
        saveState();
      }
    });
  }

  function bindButtons() {
    document.getElementById("export-btn").addEventListener("click", exportMarkdown);
    document.getElementById("upload-btn").addEventListener("click", uploadToDrive);
    document.getElementById("clear-btn").addEventListener("click", clearAll);
  }

  function buildMarkdown() {
    const lines = [];
    const date = new Date().toISOString().slice(0, 10);
    const notetaker = (state["notetaker-name"] || "").trim();
    lines.push("# Graff Dealership Visit — Discovery Notes");
    lines.push("");
    lines.push(`**Visit date:** Tuesday, June 9, 2026`);
    if (notetaker) lines.push(`**Notetaker:** ${notetaker}`);
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

    const slug = notetaker ? "-" + notetaker.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
    return {
      filename: `graff-visit-notes-${date}${slug}.md`,
      content: lines.join("\n"),
      notetaker: notetaker
    };
  }

  function exportMarkdown() {
    const md = buildMarkdown();
    const blob = new Blob([md.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = md.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function uploadToDrive() {
    const url = window.GRAFF_UPLOAD_URL;
    if (!url || url === "PASTE_APPS_SCRIPT_DEPLOYMENT_URL_HERE") {
      alert("Drive upload is not configured yet. For now, use Export Markdown and drop the file in the shared Drive folder manually.");
      return;
    }

    const md = buildMarkdown();
    if (!md.notetaker) {
      const proceed = confirm("Notetaker name is empty. Upload anyway? Filename will be untagged.");
      if (!proceed) return;
    }

    const btn = document.getElementById("upload-btn");
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Uploading…";
    setStatus("Uploading…", "saving");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          secret: window.GRAFF_UPLOAD_SECRET,
          filename: md.filename,
          content: md.content
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus("Uploaded", "saved");
      btn.textContent = "Uploaded ✓";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2500);
    } catch (e) {
      setStatus("Upload failed", "error");
      btn.textContent = originalText;
      btn.disabled = false;
      alert("Upload failed: " + e.message + "\n\nFalling back to local download.");
      exportMarkdown();
    }
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
    document.querySelectorAll('input[type="text"][data-key]').forEach((inp) => {
      inp.value = "";
      inp.classList.remove("has-content");
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
