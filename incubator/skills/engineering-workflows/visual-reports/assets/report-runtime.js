/* Original, dependency-free browser enhancement. SPDX-License-Identifier: Apache-2.0 */
(() => {
  "use strict";
  const source = JSON.parse(document.getElementById("report-data").textContent);
  const draft = JSON.parse(JSON.stringify(source));
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const announce = (text) => { byId("report-status").textContent = text; };
  document.documentElement.classList.add("js");
  function download(name, content, mime = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type: mime + ";charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const json = (value) => JSON.stringify(value, null, 2) + "\n";
  byId("style").addEventListener("change", (event) => {
    document.documentElement.dataset.style = event.target.value;
    draft.style = event.target.value;
    announce("Darstellung geändert; Inhalte und Exporte bleiben vollständig.");
  });
  byId("export-json").addEventListener("click", () => download(source.id + ".json", json(source)));
  byId("export-md").addEventListener("click", () => download(source.id + ".md", byId("report-markdown").textContent, "text/markdown"));
  byId("export-settings").addEventListener("click", () => download("visual-report-settings.json", json({ version: 1, style: { preferred: byId("style").value } })));
  byId("export-draft").addEventListener("click", () => {
    draft.draft = { localOnly: true, basedOn: source.id, note: "Lokaler Entwurf; externe Quellen wurden nicht geändert." };
    download(source.id + ".draft.json", json(draft));
    announce("Lokaler Entwurf exportiert. Kein Upload, keine Änderung der Quelldateien.");
  });
  function dirty() { announce("Ungespeicherter lokaler Entwurf. Originalexporte bleiben unverändert; Entwurf separat exportieren."); }
  all("[data-section-index]").forEach((root) => {
    const section = draft.sections[Number(root.dataset.sectionIndex)];
    const data = section.data;
    if (section.kind === "comparison") {
      all("[data-option-toggle]", root).forEach((input) => input.addEventListener("change", () => {
        all("[data-option]", root).filter((cell) => cell.dataset.option === input.value).forEach((cell) => { cell.hidden = !input.checked; });
      }));
      all("[data-criterion-toggle]", root).forEach((input) => input.addEventListener("change", () => {
        all("[data-criterion]", root).filter((row) => row.dataset.criterion === input.value).forEach((row) => { row.hidden = !input.checked; });
      }));
    }
    if (section.kind === "table") {
      const tbody = root.querySelector("tbody");
      root.querySelector("[data-search]").addEventListener("input", (event) => {
        const query = event.target.value.toLocaleLowerCase();
        all("tr", tbody).forEach((row) => { row.hidden = !row.textContent.toLocaleLowerCase().includes(query); });
        root.querySelector("[data-result-count]").textContent = `${all("tr", tbody).filter((row) => !row.hidden).length} / ${data.rows.length}`;
      });
      all("[data-sort]", root).forEach((button) => button.addEventListener("click", () => {
        const index = Number(button.dataset.sort);
        const direction = button.dataset.direction === "asc" ? "desc" : "asc";
        all("th", root).forEach((th) => th.removeAttribute("aria-sort"));
        button.closest("th").setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
        button.dataset.direction = direction;
        all("tr", tbody).sort((a, b) => {
          const av = a.cells[index].dataset.value, bv = b.cells[index].dataset.value;
          const numeric = av !== "" && bv !== "" && Number.isFinite(Number(av)) && Number.isFinite(Number(bv));
          return (numeric ? Number(av) - Number(bv) : av.localeCompare(bv)) * (direction === "asc" ? 1 : -1);
        }).forEach((row) => tbody.append(row));
      }));
    }
    if (section.kind === "motion") {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      const play = root.querySelector("[data-play]");
      const stop = root.querySelector("[data-stop]");
      let animation;
      const respectPreference = () => {
        animation?.cancel(); play.disabled = reduced.matches;
        root.querySelector("[data-motion-status]").textContent = reduced.matches ? "Reduzierte Bewegung: statischer Endzustand; Animation deaktiviert." : "Animation startet nur auf Wunsch; kein Autoplay.";
        root.querySelector(".motion-dot").style.transform = `translateX(${data.distance}px)`;
      };
      respectPreference(); reduced.addEventListener("change", respectPreference);
      play.addEventListener("click", () => {
        if (!root.querySelector("[data-duration]").reportValidity()) return;
        animation?.cancel();
        animation = root.querySelector(".motion-dot").animate([{ transform: "translateX(0)" }, { transform: `translateX(${data.distance}px)` }], { duration: Number(root.querySelector("[data-duration]").value), easing: root.querySelector("[data-easing]").value, fill: "forwards" });
      });
      stop.addEventListener("click", () => { animation?.cancel(); });
    }
    if (section.kind === "prototype") {
      let current = data.initial;
      const update = () => {
        root.querySelector("[data-prototype-state]").textContent = current;
        all("[data-transition]", root).forEach((button) => { button.disabled = data.transitions[Number(button.dataset.transition)].from !== current; });
      };
      all("[data-transition]", root).forEach((button) => button.addEventListener("click", () => { current = data.transitions[Number(button.dataset.transition)].to; update(); }));
      root.querySelector("[data-reset-prototype]").addEventListener("click", () => { current = data.initial; update(); });
      update();
    }
    if (section.kind === "slides") {
      let presenting = false, index = 0;
      const slides = all(".slide", root);
      const update = () => {
        slides.forEach((slide, i) => { slide.hidden = presenting && i !== index; });
        root.classList.toggle("presenting", presenting);
        root.querySelector("[data-slide-count]").textContent = `${index + 1} / ${slides.length}`;
        root.querySelector("[data-presentation]").setAttribute("aria-pressed", String(presenting));
      };
      const move = (delta) => { index = Math.max(0, Math.min(slides.length - 1, index + delta)); update(); };
      root.querySelector("[data-presentation]").addEventListener("click", () => { presenting = !presenting; update(); });
      root.querySelector("[data-prev]").addEventListener("click", () => move(-1));
      root.querySelector("[data-next]").addEventListener("click", () => move(1));
      root.addEventListener("keydown", (event) => {
        if (!presenting || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
        if (event.key === "Escape") { presenting = false; update(); }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
      });
      update();
    }
    if (section.kind === "board") {
      const move = (index, column) => {
        if (!Number.isInteger(index) || !data.cards[index] || !data.columns.includes(column)) return;
        data.cards[index].column = column;
        const card = root.querySelector(`[data-card-index="${index}"]`);
        all("[data-column]", root).find((node) => node.dataset.column === column).append(card);
        card.querySelector("select").value = column;
        card.querySelector("[data-card-status]").textContent = column;
        dirty();
      };
      all("[data-card-index]", root).forEach((card) => {
        card.draggable = true;
        card.addEventListener("dragstart", (event) => { event.dataTransfer.setData("application/x-visual-report-card", `${section.id}:${card.dataset.cardIndex}`); });
        card.querySelector("select").addEventListener("change", (event) => move(Number(card.dataset.cardIndex), event.target.value));
      });
      all("[data-column]", root).forEach((column) => {
        column.addEventListener("dragover", (event) => event.preventDefault());
        column.addEventListener("drop", (event) => {
          event.preventDefault();
          const [id, raw] = event.dataTransfer.getData("application/x-visual-report-card").split(":");
          if (id === section.id && /^\d+$/.test(raw ?? "")) move(Number(raw), column.dataset.column);
        });
      });
    }
    if (section.kind === "flags") {
      all("[data-flag-index]", root).forEach((row) => {
        const flag = data.flags[Number(row.dataset.flagIndex)];
        row.querySelector("[data-enabled]").addEventListener("change", (event) => { flag.enabled = event.target.checked; row.querySelector("[data-flag-status]").textContent = flag.enabled ? "An (lokaler Entwurf)" : "Aus (lokaler Entwurf)"; dirty(); });
        row.querySelector("[data-rollout]").addEventListener("input", (event) => { flag.rollout = Math.max(0, Math.min(100, Number(event.target.value))); row.querySelector("[data-rollout-value]").textContent = flag.rollout + "%"; dirty(); });
      });
    }
    if (section.kind === "prompt") {
      const update = () => { root.querySelector("[data-prompt-preview]").textContent = json(data); };
      all("[data-prompt-field]", root).forEach((input) => input.addEventListener("input", () => {
        if (!input.checkValidity()) return;
        data[input.dataset.promptField] = input.type === "number" ? Number(input.value) : input.value;
        update(); dirty();
      }));
      update();
    }
  });
})();
