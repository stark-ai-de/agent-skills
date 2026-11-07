/* Original, dependency-free browser enhancement. SPDX-License-Identifier: Apache-2.0 */
(() => {
  "use strict";
  const source = JSON.parse(document.getElementById("report-data").textContent);
  const draft = JSON.parse(JSON.stringify(source));
  let hasUnsavedDraft = false;
  let hasInvalidInput = false;
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => document.getElementById(id);
  const announce = (text) => {
    byId("report-status").textContent = text;
  };
  const json = (value) => JSON.stringify(value, null, 2) + "\n";
  const inertJson = (value) =>
    json(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  ReportState.validateRevision(source);
  document.documentElement.classList.add("js");

  // Native radio inputs keep every topic reachable without JS. This enhancement
  // synchronizes the optional slider, named arrow controls, and stable links.
  const guide = document.querySelector(".topic-guide");
  let activateTopic = () => false;
  if (guide) {
    const radios = all(".topic-radio", guide),
      slider = guide.querySelector(".topic-slider"),
      live = guide.querySelector(".topic-live");
    function select(index, writeLink = false) {
      if (index < 0 || index >= radios.length) return false;
      const radio = radios[index];
      radio.checked = true;
      slider.value = String(index + 1);
      slider.setAttribute(
        "aria-valuetext",
        `${index + 1} von ${radios.length}: ${radio.dataset.topicTitle}`,
      );
      live.textContent = `Thema ${index + 1} von ${radios.length}: ${radio.dataset.topicTitle}`;
      if (writeLink) {
        try {
          history.replaceState(null, "", `#topic-page-${radio.dataset.topicId}`);
        } catch (_) {
          /* file URLs may restrict history */
        }
      }
      return true;
    }
    activateTopic = (topicId, writeLink = false) =>
      select(
        radios.findIndex((radio) => radio.dataset.topicId === topicId),
        writeLink,
      );
    function fromHash() {
      let element;
      try {
        element = byId(decodeURIComponent(location.hash.slice(1)));
      } catch (_) {
        return;
      }
      const panel = element?.closest(".topic-panel");
      if (panel) activateTopic(panel.dataset.topicId);
    }
    radios.forEach((radio, index) => radio.addEventListener("change", () => select(index, true)));
    slider.hidden = false;
    slider.addEventListener("input", () => select(Number(slider.value) - 1, true));
    all("label.topic-arrow", guide).forEach((label) => {
      label.tabIndex = 0;
      label.setAttribute("role", "button");
      label.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          label.click();
        }
      });
      // An explicit previous/next action starts the newly selected topic at
      // its heading; ordinary rendering and automatic updates never scroll.
      label.addEventListener("click", () =>
        guide.scrollIntoView({ block: "start", behavior: "auto" }),
      );
    });
    window.addEventListener("hashchange", fromHash);
    fromHash();
    select(
      Math.max(
        0,
        radios.findIndex((radio) => radio.checked),
      ),
    );
  }

  function download(name, content, mime = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type: mime + ";charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateLedgers(current, root = document) {
    const get = (id) => root.querySelector("#" + id);
    get("report-data").textContent = inertJson(current);
    get("report-json").textContent = json(current);
    get("report-markdown").textContent = ReportState.stateMarkdown(current);
    get("report-original").textContent = json(ReportState.originalReport(current));
    get("edit-status").textContent = ReportState.editNotice(current);
    get("edit-status").hidden = !current.editing;
    all("[data-section-index]", root).forEach((section) => {
      const note = section.querySelector("[data-edit-notice]");
      note.textContent = ReportState.editNotice(
        current,
        current.sections[Number(section.dataset.sectionIndex)].id,
      );
      note.hidden = !note.textContent;
    });
  }
  const working = () => ReportState.workingReport(source, draft);
  function dirty() {
    const current = working();
    hasUnsavedDraft = hasInvalidInput || Boolean(current.editing);
    updateLedgers(current);
    announce(
      current.editing
        ? "Nutzerbearbeitung im aktuellen Arbeitsstand. HTML, Markdown und JSON exportieren diesen Stand; das Original bleibt getrennt erhalten. Kein Upload."
        : "Keine Inhaltsabweichung zum Original. Keine Quellenprüfung oder externe Änderung.",
    );
  }
  // Preview bridge retained for the managed reader. A newer revision cannot
  // replace local edits until the host explicitly discards them.
  window.visualReportView = Object.freeze({
    isDirty: () => hasUnsavedDraft,
    discardDraft: () => {
      hasUnsavedDraft = false;
      hasInvalidInput = false;
    },
    exportDraft: () => byId("export-draft").click(),
    capture: () => {
      const anchor = all("main [data-section-index]").find(
        (section) => section.getClientRects().length && section.getBoundingClientRect().bottom > 0,
      );
      return {
        scroll: scrollY,
        anchor: anchor?.id,
        topic: guide?.querySelector(".topic-radio:checked")?.dataset.topicId,
        offset: anchor?.getBoundingClientRect().top,
        open: all("details")
          .map((details, index) => (details.open ? details.id || `index-${index}` : null))
          .filter(Boolean),
      };
    },
    restore: (state) => {
      const anchor = state.anchor ? byId(state.anchor) : null;
      if (guide && !(state.topic && activateTopic(state.topic))) {
        const panel = anchor?.closest(".topic-panel");
        if (panel) activateTopic(panel.dataset.topicId);
      }
      all("details").forEach((details, index) => {
        details.open = (state.open ?? []).includes(details.id || `index-${index}`);
      });
      requestAnimationFrame(() => {
        const anchor = state.anchor ? byId(state.anchor) : null;
        scrollTo(
          0,
          anchor ? scrollY + anchor.getBoundingClientRect().top - state.offset : state.scroll,
        );
      });
    },
  });
  window.addEventListener("beforeunload", (event) => {
    if (hasUnsavedDraft) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  function exportCurrent(action) {
    const invalid = all("[data-prompt-field], [data-enabled], [data-rollout]").find(
      (input) => !validEditorInput(input),
    );
    if (invalid) {
      announce("Export blockiert: ungültige Editoreingabe korrigieren.");
      invalid.reportValidity();
      return;
    }
    try {
      const current = working();
      updateLedgers(current);
      action(current);
      announce(
        "Vollständiger Arbeitsstand exportiert. Nutzerbearbeitungen markiert; Original-Snapshot erhalten. Keine Quelldatei geändert.",
      );
    } catch (error) {
      announce("Export fehlgeschlagen: " + error.message);
    }
  }
  function validEditorInput(input) {
    return (
      input.checkValidity() &&
      (input.type !== "number" ||
        (input.value.trim() !== "" && Number.isFinite(input.valueAsNumber)))
    );
  }
  // Snapshot serialization, not a second template engine: preserve owned markup,
  // restore the full static view, and materialize only the supported editor fields.
  function snapshotHtml(current) {
    const clone = document.documentElement.cloneNode(true);
    clone.classList.remove("js");
    clone.dataset.style = current.style ?? "current";
    clone.querySelector("#report-toolbox").open = false;
    all(".topic-radio", clone).forEach((input, index) => {
      input.checked = index === 0;
      input.toggleAttribute("checked", index === 0);
    });
    const topicSlider = clone.querySelector(".topic-slider");
    if (topicSlider) {
      topicSlider.hidden = true;
      topicSlider.value = "1";
      topicSlider.setAttribute("value", "1");
    }
    const topicLive = clone.querySelector(".topic-live");
    if (topicLive) topicLive.textContent = "";
    all("label.topic-arrow", clone).forEach((label) => {
      label.removeAttribute("tabindex");
      label.removeAttribute("role");
    });
    all("[data-option], [data-criterion], tbody tr, .slide", clone).forEach((node) => {
      node.hidden = false;
    });
    all(".presenting", clone).forEach((node) => node.classList.remove("presenting"));
    const setValue = (input, value) => {
      input.value = String(value);
      input.setAttribute("value", String(value));
    };
    const setSelect = (input, value) => {
      all("option", input).forEach((option) => {
        option.selected = option.value === value;
        option.toggleAttribute("selected", option.selected);
      });
    };
    setSelect(clone.querySelector("#style"), current.style ?? "current");
    all("[data-section-index]", clone).forEach((root) => {
      const section = current.sections[Number(root.dataset.sectionIndex)],
        d = section.data;
      all("[data-option-toggle], [data-criterion-toggle]", root).forEach((input) => {
        input.checked = true;
        input.setAttribute("checked", "");
      });
      if (section.kind === "table") {
        setValue(root.querySelector("[data-search]"), "");
        root.querySelector("[data-result-count]").textContent =
          `${d.rows.length} / ${d.rows.length}`;
        all("th", root).forEach((th) => th.removeAttribute("aria-sort"));
        all("[data-sort]", root).forEach((button) => button.removeAttribute("data-direction"));
      }
      if (section.kind === "board") {
        all("[data-card-index]", root).forEach((card) => {
          const item = d.cards[Number(card.dataset.cardIndex)];
          all("[data-column]", root)
            .find((column) => column.dataset.column === item.column)
            .append(card);
          card.removeAttribute("draggable");
          setSelect(card.querySelector("select"), item.column);
          card.querySelector("[data-card-status]").textContent = item.column;
        });
      }
      if (section.kind === "flags")
        all("[data-flag-index]", root).forEach((row) => {
          const flag = d.flags[Number(row.dataset.flagIndex)],
            input = row.querySelector("[data-enabled]");
          input.checked = flag.enabled;
          input.toggleAttribute("checked", flag.enabled);
          setValue(row.querySelector("[data-rollout]"), flag.rollout);
          row.querySelector("[data-flag-status]").textContent = flag.enabled ? "An" : "Aus";
          row.querySelector("[data-rollout-value]").textContent = flag.rollout + "%";
        });
      if (section.kind === "prompt") {
        all("[data-prompt-field]", root).forEach((input) => {
          const value = d[input.dataset.promptField];
          if (input.tagName === "TEXTAREA") input.textContent = value;
          else setValue(input, value);
        });
        root.querySelector("[data-prompt-preview]").textContent = json(d);
      }
      if (section.kind === "prototype") {
        root.querySelector("[data-prototype-state]").textContent = d.initial;
        all("[data-transition]", root).forEach((button) => {
          button.disabled = d.transitions[Number(button.dataset.transition)].from !== d.initial;
        });
      }
      if (section.kind === "slides") {
        root.querySelector("[data-presentation]").setAttribute("aria-pressed", "false");
        root.querySelector("[data-presentation]").textContent = "Folienansicht";
        root.querySelector("[data-slide-count]").textContent = `1 / ${d.slides.length}`;
      }
      if (section.kind === "motion") {
        root.querySelector(".motion-dot").style.transform = `translateX(${d.distance}px)`;
        setValue(root.querySelector("[data-duration]"), d.duration);
        setSelect(root.querySelector("[data-easing]"), d.easing);
        root.querySelector("[data-play]").disabled = false;
        root.querySelector("[data-pause]").disabled = true;
        root.querySelector("[data-pause]").textContent = "Pause";
        root.querySelector("[data-motion-status]").textContent =
          "Statische Erklärung; Bewegung startet erst nach Klick.";
      }
    });
    updateLedgers(current, clone);
    clone.querySelector("#report-status").textContent = current.editing
      ? "Exportierter Arbeitsstand mit gekennzeichneten Nutzerbearbeitungen."
      : "Vollständiger Datenstand; keine Inhaltsbearbeitung.";
    return "<!doctype html>\n" + clone.outerHTML + "\n";
  }

  byId("style").addEventListener("change", (event) => {
    document.documentElement.dataset.style = event.target.value;
    draft.style = event.target.value;
    dirty();
    announce(
      "Darstellung geändert; Inhalte und Exporte bleiben vollständig. Keine dauerhafte Präferenz gespeichert.",
    );
  });
  byId("export-json").addEventListener("click", () =>
    exportCurrent((current) => download(current.id + ".json", json(current))),
  );
  byId("export-md").addEventListener("click", () =>
    exportCurrent((current) =>
      download(current.id + ".md", ReportState.stateMarkdown(current), "text/markdown"),
    ),
  );
  byId("export-draft").addEventListener("click", () =>
    exportCurrent((current) => download(current.id + ".html", snapshotHtml(current), "text/html")),
  );
  byId("export-original").addEventListener("click", () =>
    download(source.id + ".original.json", json(ReportState.originalReport(source))),
  );
  byId("export-settings").addEventListener("click", () =>
    download(
      "visual-report-settings.json",
      json({ version: 1, style: { preferred: byId("style").value } }),
    ),
  );

  all("[data-section-index]").forEach((root) => {
    const section = draft.sections[Number(root.dataset.sectionIndex)];
    const data = section.data;
    if (section.kind === "comparison") {
      all("[data-option-toggle]", root).forEach((input) =>
        input.addEventListener("change", () => {
          all("[data-option]", root)
            .filter((cell) => cell.dataset.option === input.value)
            .forEach((cell) => {
              cell.hidden = !input.checked;
            });
        }),
      );
      all("[data-criterion-toggle]", root).forEach((input) =>
        input.addEventListener("change", () => {
          all("[data-criterion]", root)
            .filter((row) => row.dataset.criterion === input.value)
            .forEach((row) => {
              row.hidden = !input.checked;
            });
        }),
      );
    }
    if (section.kind === "table") {
      const tbody = root.querySelector("tbody");
      root.querySelector("[data-search]").addEventListener("input", (event) => {
        const query = event.target.value.toLocaleLowerCase();
        all("tr", tbody).forEach((row) => {
          row.hidden = !row.textContent.toLocaleLowerCase().includes(query);
        });
        root.querySelector("[data-result-count]").textContent =
          `${all("tr", tbody).filter((row) => !row.hidden).length} / ${data.rows.length}`;
      });
      all("[data-sort]", root).forEach((button) =>
        button.addEventListener("click", () => {
          const index = Number(button.dataset.sort);
          const direction = button.dataset.direction === "asc" ? "desc" : "asc";
          all("th", root).forEach((th) => th.removeAttribute("aria-sort"));
          button
            .closest("th")
            .setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
          button.dataset.direction = direction;
          all("tr", tbody)
            .sort((a, b) => {
              const av = a.cells[index].dataset.value,
                bv = b.cells[index].dataset.value;
              const numeric =
                av !== "" &&
                bv !== "" &&
                Number.isFinite(Number(av)) &&
                Number.isFinite(Number(bv));
              return (
                (numeric ? Number(av) - Number(bv) : av.localeCompare(bv)) *
                (direction === "asc" ? 1 : -1)
              );
            })
            .forEach((row) => tbody.append(row));
        }),
      );
    }
    if (section.kind === "motion") {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      const play = root.querySelector("[data-play]"),
        pause = root.querySelector("[data-pause]");
      const status = root.querySelector("[data-motion-status]");
      let animation;
      const reset = () => {
        animation?.cancel();
        animation = undefined;
        pause.disabled = true;
        pause.textContent = "Pause";
        root.querySelector(".motion-dot").style.transform = `translateX(${data.distance}px)`;
      };
      const respectPreference = () => {
        reset();
        play.disabled = reduced.matches;
        status.textContent = reduced.matches
          ? "Reduzierte Bewegung: statischer Endzustand; Animation deaktiviert."
          : "Animation startet nur auf Wunsch; kein Autoplay.";
      };
      respectPreference();
      reduced.addEventListener("change", respectPreference);
      play.addEventListener("click", () => {
        if (reduced.matches || !root.querySelector("[data-duration]").reportValidity()) return;
        reset();
        animation = root
          .querySelector(".motion-dot")
          .animate(
            [{ transform: "translateX(0)" }, { transform: `translateX(${data.distance}px)` }],
            {
              duration: Number(root.querySelector("[data-duration]").value),
              easing: root.querySelector("[data-easing]").value,
              fill: "forwards",
            },
          );
        pause.disabled = false;
        status.textContent = "Animation läuft; statische Erklärung bleibt verfügbar.";
        animation.onfinish = () => {
          pause.disabled = true;
          status.textContent = "Endzustand erreicht.";
        };
      });
      pause.addEventListener("click", () => {
        if (!animation || reduced.matches) return;
        if (animation.playState === "paused") {
          animation.play();
          pause.textContent = "Pause";
          status.textContent = "Animation läuft.";
        } else {
          animation.pause();
          pause.textContent = "Fortsetzen";
          status.textContent = "Animation pausiert.";
        }
      });
      root.querySelector("[data-stop]").addEventListener("click", respectPreference);
    }
    if (section.kind === "prototype") {
      let current = data.initial;
      const update = () => {
        root.querySelector("[data-prototype-state]").textContent = current;
        all("[data-transition]", root).forEach((button) => {
          button.disabled = data.transitions[Number(button.dataset.transition)].from !== current;
        });
      };
      all("[data-transition]", root).forEach((button) =>
        button.addEventListener("click", () => {
          current = data.transitions[Number(button.dataset.transition)].to;
          update();
        }),
      );
      root.querySelector("[data-reset-prototype]").addEventListener("click", () => {
        current = data.initial;
        update();
      });
      update();
    }
    if (section.kind === "slides") {
      let presenting = source.presentation === "slides",
        index = 0;
      const slides = all(".slide", root);
      root.tabIndex = 0;
      const update = () => {
        slides.forEach((slide, i) => {
          slide.hidden = presenting && i !== index;
        });
        root.classList.toggle("presenting", presenting);
        root.querySelector("[data-slide-count]").textContent = `${index + 1} / ${slides.length}`;
        const toggle = root.querySelector("[data-presentation]");
        toggle.setAttribute("aria-pressed", String(presenting));
        toggle.textContent = presenting ? "Leseansicht" : "Folienansicht";
        root.querySelector("[data-prev]").disabled = !presenting || index === 0;
        root.querySelector("[data-next]").disabled = !presenting || index === slides.length - 1;
      };
      const move = (delta) => {
        index = Math.max(0, Math.min(slides.length - 1, index + delta));
        update();
      };
      root.querySelector("[data-presentation]").addEventListener("click", () => {
        presenting = !presenting;
        update();
      });
      root.querySelector("[data-prev]").addEventListener("click", () => move(-1));
      root.querySelector("[data-next]").addEventListener("click", () => move(1));
      root.addEventListener("keydown", (event) => {
        if (!presenting || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
        if (event.key === "Escape") {
          presenting = false;
          update();
        }
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      });
      update();
    }
    if (section.kind === "board") {
      const move = (index, column) => {
        if (!Number.isInteger(index) || !data.cards[index] || !data.columns.includes(column))
          return;
        data.cards[index].column = column;
        const card = root.querySelector(`[data-card-index="${index}"]`);
        all("[data-column]", root)
          .find((node) => node.dataset.column === column)
          .append(card);
        card.querySelector("select").value = column;
        card.querySelector("[data-card-status]").textContent = column;
        dirty();
      };
      all("[data-card-index]", root).forEach((card) => {
        card.draggable = true;
        card.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData(
            "application/x-visual-report-card",
            `${section.id}:${card.dataset.cardIndex}`,
          );
        });
        card
          .querySelector("select")
          .addEventListener("change", (event) =>
            move(Number(card.dataset.cardIndex), event.target.value),
          );
      });
      all("[data-column]", root).forEach((column) => {
        column.addEventListener("dragover", (event) => event.preventDefault());
        column.addEventListener("drop", (event) => {
          event.preventDefault();
          const [id, raw] = event.dataTransfer
            .getData("application/x-visual-report-card")
            .split(":");
          if (id === section.id && /^\d+$/.test(raw ?? ""))
            move(Number(raw), column.dataset.column);
        });
      });
    }
    if (section.kind === "flags") {
      all("[data-flag-index]", root).forEach((row) => {
        const flag = data.flags[Number(row.dataset.flagIndex)];
        row.querySelector("[data-enabled]").addEventListener("change", (event) => {
          flag.enabled = event.target.checked;
          row.querySelector("[data-flag-status]").textContent = flag.enabled
            ? "An (Nutzerbearbeitung)"
            : "Aus (Nutzerbearbeitung)";
          dirty();
        });
        row.querySelector("[data-rollout]").addEventListener("input", (event) => {
          flag.rollout = Math.max(0, Math.min(100, Number(event.target.value)));
          row.querySelector("[data-rollout-value]").textContent = flag.rollout + "%";
          dirty();
        });
      });
    }
    if (section.kind === "prompt") {
      const update = () => {
        root.querySelector("[data-prompt-preview]").textContent = json(data);
      };
      all("[data-prompt-field]", root).forEach((input) =>
        input.addEventListener("input", () => {
          hasInvalidInput = all("[data-prompt-field]").some((field) => !validEditorInput(field));
          if (hasInvalidInput) {
            hasUnsavedDraft = true;
            announce("Ungültige Editoreingabe; Export bis zur Korrektur blockiert.");
            return;
          }
          data[input.dataset.promptField] =
            input.type === "number" ? Number(input.value) : input.value;
          update();
          dirty();
        }),
      );
      update();
    }
  });
})();
