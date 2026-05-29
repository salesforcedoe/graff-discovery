(function () {
  const STORAGE_KEY = "graff-discovery-v1";
  const SAVE_DEBOUNCE_MS = 400;
  const PHOTO_MAX_EDGE = 1280;
  const PHOTO_QUALITY = 0.8;

  const state = loadState();
  let saveTimer = null;

  document.addEventListener("DOMContentLoaded", () => {
    renderQuestions();
    renderPhotoSections();
    hydrateInputs();
    hydratePhotos();
    bindInputs();
    bindButtons();
    bindPhotoUpload();
    bindPhotoModal();
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

  function renderPhotoSections() {
    // Sections that get a photo strip: every persona card + themes.
    const sections = [
      "persona-1", "persona-2", "persona-3", "persona-4",
      "persona-5", "persona-6", "persona-7", "persona-8",
      "themes"
    ];
    sections.forEach((section) => {
      const card = document.getElementById(section);
      if (!card) return;
      const block = document.createElement("div");
      block.className = "photo-block";
      block.innerHTML = `
        <div class="photo-toolbar">
          <label class="photo-add-btn btn btn-secondary">
            <span>Add photo</span>
            <input type="file" accept="image/*" capture="environment" multiple data-photo-section="${section}" hidden>
          </label>
          <span class="photo-count" data-photo-count="${section}"></span>
        </div>
        <div class="photo-grid" data-photo-grid="${section}"></div>
      `;
      card.appendChild(block);
    });
  }

  function getPhotos(section) {
    const arr = state[`photos-${section}`];
    return Array.isArray(arr) ? arr : [];
  }

  function setPhotos(section, photos) {
    state[`photos-${section}`] = photos;
    saveState();
  }

  function hydratePhotos() {
    document.querySelectorAll("[data-photo-grid]").forEach((grid) => {
      renderPhotoGrid(grid.dataset.photoGrid);
    });
  }

  function renderPhotoGrid(section) {
    const grid = document.querySelector(`[data-photo-grid="${section}"]`);
    const count = document.querySelector(`[data-photo-count="${section}"]`);
    if (!grid) return;
    const photos = getPhotos(section);
    grid.innerHTML = photos
      .map(
        (p, i) => `
          <div class="photo-thumb" data-photo-section="${section}" data-photo-index="${i}">
            <img src="${p.dataUrl}" alt="${escapeHtml(p.caption || "Note photo")}" loading="lazy">
            <button type="button" class="photo-remove" data-remove-section="${section}" data-remove-index="${i}" aria-label="Remove photo">×</button>
          </div>
        `
      )
      .join("");
    if (count) {
      count.textContent = photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "";
    }
  }

  function bindPhotoUpload() {
    document.addEventListener("change", async (e) => {
      const t = e.target;
      if (!(t.tagName === "INPUT" && t.type === "file" && t.dataset.photoSection)) return;
      const section = t.dataset.photoSection;
      const files = Array.from(t.files || []);
      if (files.length === 0) return;
      setStatus("Processing…", "saving");
      try {
        const photos = getPhotos(section).slice();
        for (const file of files) {
          const dataUrl = await resizeImage(file);
          photos.push({ dataUrl, addedAt: new Date().toISOString() });
        }
        setPhotos(section, photos);
        renderPhotoGrid(section);
      } catch (err) {
        alert("Couldn't add photo: " + err.message);
        setStatus("Error", "error");
      } finally {
        t.value = ""; // allow re-adding the same file
      }
    });

    document.addEventListener("click", (e) => {
      const t = e.target;
      if (t.classList && t.classList.contains("photo-remove")) {
        e.preventDefault();
        const section = t.dataset.removeSection;
        const idx = parseInt(t.dataset.removeIndex, 10);
        const photos = getPhotos(section).slice();
        photos.splice(idx, 1);
        setPhotos(section, photos);
        renderPhotoGrid(section);
      } else if (t.tagName === "IMG" && t.closest(".photo-thumb")) {
        const thumb = t.closest(".photo-thumb");
        openPhotoModal(thumb.dataset.photoSection, parseInt(thumb.dataset.photoIndex, 10));
      }
    });
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        return reject(new Error("Not an image file"));
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Read failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image decode failed"));
        img.onload = () => {
          const { width, height } = img;
          const longest = Math.max(width, height);
          const scale = longest > PHOTO_MAX_EDGE ? PHOTO_MAX_EDGE / longest : 1;
          const w = Math.round(width * scale);
          const h = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
            resolve(dataUrl);
          } catch (e) {
            reject(new Error("Encode failed"));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function openPhotoModal(section, index) {
    const modal = document.getElementById("image-modal");
    const img = modal.querySelector(".image-modal-img");
    const photo = getPhotos(section)[index];
    if (!photo) return;
    img.src = photo.dataUrl;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closePhotoModal() {
    const modal = document.getElementById("image-modal");
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function bindPhotoModal() {
    const modal = document.getElementById("image-modal");
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.classList.contains("image-modal-close")) {
        closePhotoModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        closePhotoModal();
      }
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
    document.getElementById("clear-btn").addEventListener("click", clearAll);

    // Mobile: collapse the sidebar dropdown after a nav link is tapped.
    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        const details = document.querySelector(".sidebar-toggle");
        if (details && window.matchMedia("(max-width: 900px)").matches) {
          details.open = false;
        }
      });
    });
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
      const photos = getPhotos(section);
      if (photos.length) {
        lines.push(`### Photos (${photos.length})`);
        lines.push("");
        photos.forEach((p, i) => {
          lines.push(`![${label} photo ${i + 1}](${p.dataUrl})`);
          lines.push("");
        });
      }
    });

    const themesNotes = (state["freeform-themes"] || "").trim();
    const themesPhotos = getPhotos("themes");
    if (themesNotes || themesPhotos.length) {
      lines.push(`## ${window.GRAFF_PERSONA_LABELS["themes"]}`);
      lines.push("");
      if (themesNotes) {
        lines.push(themesNotes);
        lines.push("");
      }
      if (themesPhotos.length) {
        lines.push(`### Photos (${themesPhotos.length})`);
        lines.push("");
        themesPhotos.forEach((p, i) => {
          lines.push(`![Themes photo ${i + 1}](${p.dataUrl})`);
          lines.push("");
        });
      }
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

  function clearAll() {
    const ok = confirm("Clear all notes and photos from this browser? This cannot be undone. Export first if you want a copy.");
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
    document.querySelectorAll("[data-photo-grid]").forEach((grid) => {
      renderPhotoGrid(grid.dataset.photoGrid);
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
