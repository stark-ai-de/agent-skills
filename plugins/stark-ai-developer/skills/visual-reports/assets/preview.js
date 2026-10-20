// SPDX-License-Identifier: Apache-2.0
(() => {
  const byId = (id) => document.getElementById(id),
    frame = byId("report"),
    select = byId("versions");
  let loaded = null,
    latest = null,
    pendingView = null;
  const view = () => frame.contentWindow?.visualReportView;
  const announce = (text) => {
    byId("notice").textContent = text;
  };
  function apply(revision) {
    if (!revision || revision === loaded) return;
    if (view()?.isDirty() && !byId("discard").checked) {
      announce(
        "Ungesicherter Entwurf geschützt. Erst exportieren oder ausdrücklich Verwerfen wählen.",
      );
      return;
    }
    pendingView = view()?.capture() ?? null;
    if (byId("discard").checked) view()?.discardDraft();
    loaded = revision;
    byId("discard").checked = false;
    frame.src = `/revision/${revision}/report.html`;
    for (const ext of ["html", "md", "json"])
      byId(ext).href = `/revision/${revision}/report.${ext}`;
    select.value = revision;
    announce(revision === latest ? "Aktueller Stand übernommen." : "Historischer Stand geöffnet.");
  }
  frame.addEventListener("load", () => {
    if (pendingView) view()?.restore(pendingView);
    pendingView = null;
  });
  byId("apply").addEventListener("click", () => apply(select.value));
  byId("draft").addEventListener("click", () => view()?.exportDraft());
  window.addEventListener("beforeunload", (e) => {
    if (view()?.isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  async function poll() {
    try {
      const response = await fetch("/current", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json();
      const previous = latest;
      latest = data.revision;
      const selected = select.value;
      select.replaceChildren(
        ...data.history.map((revision, i) => {
          const option = document.createElement("option");
          option.value = revision.revision;
          option.textContent = `${revision.createdAt}${i === 0 ? " · aktuell" : ""}`;
          return option;
        }),
      );
      select.value = selected || latest;
      if (!loaded) apply(latest);
      else if (previous !== latest && loaded !== latest) {
        select.value = latest;
        announce(
          "Neuer Stand verfügbar. Mit Übernehmen wechseln; der angezeigte Report bleibt erhalten.",
        );
      }
    } catch {
      announce("Vorschau-Verbindung unterbrochen. Der geöffnete Report bleibt lesbar.");
    }
    setTimeout(poll, 1500);
  }
  poll();
})();
