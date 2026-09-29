---
title: "Hetzner Inference Setup: Hardening und Qualifikation"
slug: "hetzner-inference-setup-hardening"
artifact_path: "docs/specs/hetzner-inference-setup-hardening-spec.md"
mode: "standard"
status: "approved"
owner: "stark-ai-de"
repo: "stark-ai-de/agent-skills"
created: "2026-09-29"
updated: "2026-09-29"
source_request: "Anpassungen aus dem Review von PR #88 planen."
---

# Hetzner Inference Setup: Hardening und Qualifikation

## Freigegebener Stand und Ausführungsgrenze

Diese Spezifikation hält den am 29.09.2026 vorgelegten und anschließend mit „ja“ freigegebenen **Änderungsplan v1 für PR #88** fest. Die Freigabe umfasst seinen Inhalt und die öffentliche Ablage ausschließlich dieser neuen Datei im bestehenden PR. Sie autorisiert noch keine Code-, Test-, CI- oder Infrastrukturänderungen und keine Live-Tests, Merges oder Releases.

Grundlage ist [PR #88](https://github.com/stark-ai-de/agent-skills/pull/88) am Head `ab62337d66203f2baf63321bf835637eca997e2d`, auf Basis von `main` bei `1e04e0cf370bd19ec119da9d6e297ceaf5ed2b1c`, sowie das [Review vom 29.09.2026](https://github.com/stark-ai-de/agent-skills/pull/88#pullrequestreview-5351221828). Vor der Ablage wurde dieser unveränderte Head erneut geprüft; der vorgesehene Dateipfad war noch nicht vorhanden.

Diese ergänzende Spezifikation ersetzt weder die bestehende [genehmigte Hetzner-Spezifikation](hetzner-inference-setup-skill-spec.md) noch deren Abnahmekriterien. Offene Qualification Gaps bleiben offen, bis die vorgesehenen Nachweise tatsächlich vorliegen. `status: approved` bezeichnet die Planfreigabe, nicht abgeschlossene Implementierung oder Merge-Bereitschaft.

## 1. Ziel und Grenzen

Die bestehende Architektur erhalten, die drei konkreten Review-Befunde beheben, Windows gezielt stabilisieren und die Qualification Gaps mit überprüfbaren Abschlussbedingungen bearbeiten. Ein großer Umbau oder eine stillschweigende Einschränkung des bisherigen Funktionsumfangs ist nicht vorgesehen.

Nach den Anpassungen sollen die Helfer korrekte Ergebnisse liefern, die Anleitungen keine unsicheren Konfigurationswege empfehlen und die Nachweise eindeutig zeigen, welche konkrete Kombination tatsächlich funktioniert.

Unverändert bleiben die Trennung zwischen lokalen und entfernten Gateways, der vollständig nichtmutierende manuelle Modus, getrennte Schlüsselrollen, geschützte Dateizugriffe und eigentumsgebundener Rollback. Insbesondere bleiben minimale Unterprozessumgebungen und die Loopback-Grenze bestehen.

### Nicht Bestandteil

- Ein providerneutrales Gateway-Framework oder eine eigene Protokollübersetzung.
- Änderungen an der Plugin-Mitgliedschaft.
- Automatische Kubernetes- oder Datenbankänderungen sowie die öffentliche Freigabe des lokalen Gateways.
- Merge und Release.

## 2. Arbeitspaket A: Die drei konkreten Fehler korrigieren

Diese Änderungen sind unabhängig von echten Provider-Zugangsdaten umsetzbar und überprüfbar.

### A1. UTF-8 in Unterprozessausgaben

**Umsetzungsweg:** In `scripts/lib/subprocess.mjs` pro Ausgabekanal Rohbytes zählen, Buffer sammeln und erst nach Abschluss gemeinsam dekodieren. Den im Review vorhandenen Patch als Ausgangspunkt prüfen, nicht ungeprüft übernehmen.

**Abnahme:** Aufgeteilte Mehrbytezeichen bleiben unverändert. Das exakte Byte-Limit wird akzeptiert; eine tatsächliche Überschreitung wird weiterhin abgelehnt.

Die Regressionen umfassen stdout und stderr, ASCII sowie Zwei-, Drei- und Vierbytezeichen, Verteilung über mehrere zeitlich getrennte Events, exakte Grenzen, Überschreitungen und Nonzero-Exit. Timeout, Kill-Eskalation und Fehlerredaktion müssen unverändert funktionieren.

Node stellt mit `StringDecoder` eine Alternative für chunkübergreifende Dekodierung bereit. Für den vorhandenen begrenzten Gesamtausgabepuffer ist der einfachere Buffer-Ansatz vorgesehen; siehe [Node StringDecoder](https://nodejs.org/api/string_decoder.html).

### A2. Unvollständige Remote-Antworten

**Umsetzungsweg:** In `scripts/lib/remote.mjs` den Abbruchgrund vor dem Erfolgskriterium „nichtleerer Text“ auswerten.

**Abnahme:** `finish_reason: "length"` liefert auch bei vorhandenem Teiltext keinen Inferenz-Erfolg, sondern `inference_budget_exhausted` und einen Fehler-Exit.

Die Regressionen umfassen vollständige Antworten, leeren Inhalt, Teilantworten mit erschöpftem Budget, ungültige Antwortstrukturen und HTTP-Fehler. Die normalen erfolgreichen Antworten und die bestehende CLI-Ausgabeform bleiben kompatibel.

### A3. Unsichere Cursor-Anleitung

**Umsetzungsweg:** Die Empfehlung entfernen, bei einem sichtbaren Base-URL-Feld den lokalen Admin-Schlüssel einzutragen. Lokale Loopback-Nutzung bleibt ohne nachgewiesenen Request-Pfad blockiert.

**Abnahme:** Keine erzeugte Anleitung empfiehlt die Weitergabe des lokalen Admin-Schlüssels. Remote-Anleitungen verlangen einen gesonderten Inferenzschlüssel und einen tatsächlichen Client-Test.

Sowohl den direkt erzeugten Guide als auch manuelle Anleitungen und Referenzen prüfen. Der Hintergrund ist nicht nur Erreichbarkeit: Die im freigegebenen Plan berücksichtigte [Cursor-BYOK-Dokumentation](https://prod.cursor.com/help/models-and-usage/api-keys) beschreibt die Übertragung des Schlüssels mit Anfragen an das Cursor-Backend. Das sichtbare UI-Feld allein ist deshalb keine Qualifikation des lokalen Pfads.

## 3. Arbeitspaket B: Windows reproduzierbar stabilisieren

Für Windows ist noch kein vermeintlicher Fix festgelegt. Der Fehler ist im geprüften PR-Stand belegt; die Ursache der wiederkehrenden PowerShell-/ACL-Timeouts ist noch nicht hinreichend nachgewiesen. Der [Windows-Job des vorhandenen CI-Laufs](https://github.com/stark-ai-de/agent-skills/actions/runs/36463178713/job/109066591695) bleibt ein Fehlschlag und kein aktueller Erfolgsnachweis.

### Stufendiagnose auf einem nativen Windows-Runner

1. **Prozessstart:** Startet das tatsächlich verwendete PowerShell-Executable innerhalb des vorgesehenen Budgets?
2. **Argumenttransport:** Kommen leere, Unicode- und Sonderzeichenargumente unverändert an?
3. **Rechte lesen:** Funktionieren `Get-Acl`, Owner-SID und rohe SID-Regeln?
4. **Rechte setzen:** Funktioniert `icacls` ausschließlich an eigens erzeugten Testdateien samt anschließendem Readback?
5. **Integration:** Funktionieren beide ACL-Helfer und danach die abhängigen Lifecycle-Operationen?

Die Diagnose vergleicht Produktions-Minimalumgebung und native Referenzumgebung. Unterschiede werden gezielt eingegrenzt. Pro Stufe werden nur Dauer, Exitstatus und bereinigte Fehlerkategorie aufgezeichnet, keine vollständigen Umgebungsvariablen oder Schlüsselwerte.

Erst nach einem belastbaren Reproduzierer folgt die kleinste passende Korrektur. Eine erforderliche Umgebungsvariable darf gezielt ergänzt werden; die gesamte Benutzerumgebung pauschal zu übernehmen ist kein geplanter Lösungsweg.

Nicht als Fix akzeptiert werden das Abschalten von Sicherheitsprüfungen, das Überspringen fehlgeschlagener Tests, das Entfernen der Matrix oder Timeout-Erhöhungen ohne Messgrundlage.

**Abnahme:** Der ursprüngliche Fehler ist reproduziert, der gezielte Regressionstest besteht nach der Korrektur und anschließend läuft die vollständige Windows-Helfersuite erfolgreich. Linux und macOS dürfen dadurch nicht regressieren. Diagnose und Fix bleiben nachvollziehbar getrennt.

## 4. Arbeitspaket C: Qualifikationsstatus konsistent machen

Keine zweite Validierungsarchitektur einführen, sondern eine kleine maschinenlesbare Zusammenfassung der bestehenden Nachweise. Geplant ist ein neuer Index:

```text
skill-evals/hetzner-inference-setup/qualification.json
```

Er referenziert vorhandene beziehungsweise neue bereinigte Testberichte und unterscheidet zwei unabhängige Aspekte:

| Aspekt | Geplante Werte |
| --- | --- |
| Tatsächliche Ausführung | `passed`, `failed`, `not_run`, `inconclusive` |
| Hersteller-Unterstützung | `supported`, `unsupported`, `unknown`, `not_applicable` |

Jeder Eintrag wird an Quellstand oder relevanten Fingerprint, Ziel, Betriebssystem, beteiligte Versionen, Modell, Szenario und Zeitpunkt gebunden. Öffentliche Einträge enthalten keine privaten Pfade, Hostnamen, Schlüssel oder ungefilterten Modellantworten.

### Regeln und Abnahme

- Ein erfolgreicher Gateway-Test ersetzt keinen nativen Client-Test.
- Ein neuerer Fehlschlag wird nicht von einem älteren Erfolg verdeckt.
- Veränderte Komponenten machen nur die davon betroffenen Nachweise unbrauchbar.
- Die bestehenden geschlossenen Runtime-Evidence-Schemas werden nicht durch zusätzliche Felder aufgeweicht.

Der Index wird im vorhandenen Hetzner-Validator strukturell geprüft. Die normale CI benötigt dafür keine Live-Zugangsdaten. Sie prüft die Konsistenz der Nachweise, erzeugt aber keinen erfundenen Live-Erfolg.

Diese Bindung und die gezielte Wiederverwendung von Nachweisen folgen [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md).

## 5. Arbeitspaket D: Qualification Gaps gezielt bearbeiten

Dieser Block trennt vorbereitbare Repository-Arbeit von gesondert freizugebenden Live-Aktionen.

### D1. Remote-Gateway

Im Repository werden Betreiberübergabe, Voraussetzungserkennung und der Ablauf für einen temporären Test präzisiert. Die tatsächlich installierte LiteLLM-Version ist maßgeblich.

Der Live-Abschlussnachweis lautet:

```text
Voraussetzungen bestätigen
→ eigene temporäre Route erstellen
→ zurücklesen
→ mit separatem Inferenzschlüssel testen
→ eigene Route löschen
→ Abwesenheit bestätigen
```

Die Aktivierung der DB-Modellablage bleibt eine Betreiberaktion. Bestehende Verschlüsselungswerte bleiben unverändert. Die dokumentierten zwei Rollouts werden als möglicher Bestandteil des konkreten Betreiberverfahrens beschrieben, nicht als allgemeine Voraussetzung jeder Modelländerung. Im aktivierten DB-Modus dokumentiert [LiteLLM Model Management](https://docs.litellm.ai/docs/proxy/model_management) Modelländerungen ohne Proxy-Neustart; der konkrete installierte Vertrag muss bei der Umsetzung erneut bestätigt werden.

**Abnahme:** Ein echter, bereinigter Nachweis für Create, Readback, Inferenz und eigentumsgebundene Bereinigung. Eine korrekt angezeigte Betreiberübergabe schließt diesen Live-Gap nicht.

### D2. Codex

Zunächst wird eine konkrete offizielle LiteLLM-/Modell-Kombination gegen den bekannten Instruktionsreihenfolgefehler geprüft. Ein verfügbarer Upstream-Fix darf nicht automatisch mit erfolgreicher Unterstützung gleichgesetzt werden.

Die Prüfung erfolgt in zwei Stufen: zuerst ein kleiner Kompatibilitätstest für initiale und spätere Instruktionen sowie Tool-Fortsetzungen; danach die vollständigen vorgesehenen Codex-Szenarien einschließlich Streaming, Datei lesen, Shell, Patch, Diff, Abbruch, Fehlerbehandlung, Kontextwachstum und Kompaktierung.

**Abnahme:** Die benötigten Szenarien bestehen mit der exakt dokumentierten Kombination. Keine Umwandlung von Developer-Instruktionen in User-Nachrichten und kein Entfernen notwendiger Tools als Ausweichlösung.

Ein Versionspin wird nur auf einen konkret geprüften Stand geändert, nicht pauschal auf `latest`. Die bestehenden Szenarien und Nachweisgrenzen aus [Live Proof](../../skills/engineering-workflows/hetzner-inference-setup/references/live-proof.md) bleiben maßgeblich. Der im Review referenzierte [LiteLLM-PR #39852](https://github.com/BerriAI/litellm/pull/39852) ist eine zu prüfende Quelle, kein Ersatz für den eigenen Kombinationsnachweis.

### D3. NixOS

Zuerst wird das konkret fehlende native Modul beziehungsweise seine Bibliotheksabhängigkeit eingegrenzt. Danach wird geprüft, ob eine vorbereitete paketierte Runtime innerhalb der bestehenden Start- und Sicherheitsgrenzen genügt.

**Abnahme:** Native Imports, Gateway-Start, Probe und Stop funktionieren auch mit der produktiv bereinigten Prozessumgebung.

Benötigt das einen neuen Packaging-Adapter oder eine andere Runtime-Zuständigkeit, bekommt dieser Teil ein eigenes Architektur-Gate. Dieser Plan autorisiert keine stillschweigende Systemkonfiguration und zählt einen Container-Test nicht als nativen Nachweis.

### D4. Claude Code

Die Kombination wird deutlich als experimentell gekennzeichnet. Ein technischer Erfolg und Hersteller-Unterstützung bleiben getrennte Aussagen. Die im Plan berücksichtigte [Claude-Code-Gateway-Dokumentation](https://code.claude.com/docs/en/llm-gateway) unterstützt das Routing von Claude Code zu Nicht-Claude-Modellen ausdrücklich nicht.

**Abnahme für technische Funktion:** Die vorgesehenen nativen Messages-, Tool-, Repository-, Terminal-, Edit-, Diff-, Mehrturn-, Abbruch- und Fehlerszenarien bestehen. Der Herstellerstatus bleibt davon unberührt.

### D5. Cursor

Nach der Anleitungskorrektur wird ausschließlich ein ausdrücklich gewählter und aus dem tatsächlichen Cursor-Pfad erreichbarer Remote-Endpunkt getestet. Verwendet wird ein separater Inferenzschlüssel.

**Abnahme:** Ein echter Standard-Chat im installierten Client funktioniert; Version, Route und Einschränkungen sind dokumentiert. Daraus wird keine zusätzliche Freigabe für Tab, Composer oder Agent-Tools abgeleitet.

## 6. Dateiplan und begrenzte Optimierungen

Die folgenden Pfade sind relativ zu `skills/engineering-workflows/hetzner-inference-setup/`, soweit nicht anders angegeben. Dies ist der Plan für eine spätere gesondert autorisierte Umsetzung, nicht der Schreibumfang der Spezifikationsablage.

| Bereich | Erwartete Änderungen |
| --- | --- |
| Direkte Fehlerkorrekturen | `scripts/lib/subprocess.mjs`, `scripts/lib/remote.mjs`, `scripts/lib/config.mjs` |
| Konsistente Anleitungen | `scripts/lib/manual.mjs`, betroffene Dateien unter `references/`, gegebenenfalls `SKILL.md` und Remote-Client-Guidance |
| Windows-Fix nach Diagnose | Nur die betroffenen Stellen in `scripts/lib/permissions.mjs`, `scripts/lib/hosts.mjs` und `assets/templates/protected-file.mjs` |
| Regressionen, repository-relativ | Bestehende Tests unter `scripts/validation/hetzner-inference-setup/`; neue fokussierte `subprocess.test.mjs` und `windows-acl.test.mjs` in diesem Testverzeichnis samt Registrierung |
| Nachweise, repository-relativ | Neuer Qualifikationsindex, bereinigte Berichte unter `skill-evals/hetzner-inference-setup/runs/` und aktualisierte Verweise |
| CI, repository-relativ | `.github/workflows/validate.yml` nur für notwendige Diagnose-/Nachweisverbesserungen; keine Abschwächung der Plattformprüfung |

Gemeinsame reine Hilfsfunktionen werden nur dort zusammengeführt, wo es für diese Änderungen einen konkreten Nutzen gibt. Ein umfassender Umbau der Datei-, Lock- oder Lifecycle-Schichten wird nicht mit den Fehlerkorrekturen vermischt.

### Reihenfolge

Zuerst die unabhängigen reproduzierbaren Fehlerkorrekturen aus A umsetzen. Windows nach dem Prinzip „erst reproduzieren, dann korrigieren“ bearbeiten. Danach den Qualifikationsindex und die vorbereitbaren Übergaben konsistent integrieren. Live-Aktionen aus D bleiben an ihre gesonderte Ziel-, Zugangsdaten- und Aktionsfreigabe gebunden. Neue Runtime-Entscheidungen bleiben am jeweiligen Architektur-Gate angehalten.

## 7. Validierung, Risiken und Abschluss

Während der Umsetzung werden zunächst die jeweiligen Reproduzierer und betroffenen Tests ausgeführt. Für den integrierten Kandidaten sind die bestehenden Repository-Befehle vorgesehen:

```bash
pnpm run validate:hetzner-inference
pnpm run lint
pnpm run format:check
pnpm run validate:skills
pnpm run smoke:install
git diff --check
```

Bei CI-Änderungen kommt `pnpm run lint:actions` hinzu. Für die angestrebte öffentliche Bereitschaft folgt der in der ursprünglichen Spezifikation vorgesehene lokale Gesamtcheck `pnpm run validate` sowie die verpflichtende gehostete Validierung. Der Gesamtcheck wird nicht nach jeder kleinen Änderung wiederholt.

Diese Befehle sind Umsetzungs- und Freigabekriterien. Ihre Nennung behauptet keine erneute Ausführung oder erfolgreichen Lauf durch das Speichern dieser Spezifikation.

### Risiken, Rollout und Rücknahme

Windows-Timeouts haben noch keine bewiesene Ursache. Native Client-/NixOS-Umgebungen sowie Betreiberfreigaben können die abhängigen Nachweise weiter blockieren. Ein Wechsel von Version oder Modell muss deshalb separat qualifiziert werden und darf ältere Ergebnisse nicht pauschal übernehmen.

Änderungen werden in getrennten, rücknehmbaren Schritten vorgenommen. Runtime-Pins ändern sich nur bei Bedarf und mit eigener Qualifikation. Bei unklarer Remote-Erstellung wird nicht blind wiederholt; bei nicht bestätigter Bereinigung bleibt der Zustand ausdrücklich offen. Gewöhnlicher Rollback löscht keine Zugangsdaten.

### Zwei getrennte Abschlusszustände

| Zustand | Bedeutung |
| --- | --- |
| Repository-Korrekturen abgeschlossen | Die drei Befunde sind behoben, Windows ist stabilisiert, Regressionen und Statusdarstellung sind geprüft. |
| PR freigabefähig | Zusätzlich sind die im bestehenden Umfang verpflichtenden Live-Nachweise erfüllt und aktuelle Review-Befunde geschlossen. |

Fehlende Umgebungen werden dokumentiert, aber nicht als erfolgreiche Qualifikation gewertet. Das Speichern dieser Datei erfüllt keinen der beiden Umsetzungszustände.

## 8. Architektur-Gate

- **ADR erforderlich:** Für die direkten Korrekturen und den beschriebenen begrenzten Qualifikationsindex ist kein neuer ADR vorgesehen.
- **Grund:** Die Änderungen setzen die bestehenden Sicherheits-, Eigentums- und Nachweisentscheidungen um, ohne deren Grenzen zu ändern.
- **Bestehende Entscheidungen:** [ADR-0047](../adrs/0047-use-a-local-litellm-gateway-for-hetzner-coding-clients.long.md), [ADR-0048](../adrs/0048-implement-one-portable-hetzner-setup-skill-with-client-adapters.long.md), [ADR-0049](../adrs/0049-separate-hetzner-provider-and-local-gateway-credentials.long.md) und [ADR-0041](../adrs/0041-select-validation-from-changed-contracts-and-owning-boundaries.long.md).
- **Neuer ADR-Entwurf / Supersedes:** Keiner für den freigegebenen direkten Korrekturumfang.
- **Bedingter Gate:** Ein neuer NixOS-Packaging-Ansatz oder eine Änderung des unterstützten Umfangs wird vor der abhängigen Implementierung gesondert bewertet. Erforderliche neue Entscheidungen benötigen ihre eigene Annahme.
- **Unverändert:** Bereits angenommene Entscheidungen werden nicht nachträglich umgeschrieben. Für die spätere lokale Umsetzung gelten die Repository-Anweisungen und [ADR-0029](../adrs/0029-keep-linked-worktrees-inside-the-repository.long.md) zur isolierten Schreibumgebung.

## 9. Source Challenge und offene Fakten

Die fachliche Source Challenge stammt aus dem freigegebenen Änderungsplan und dem verlinkten Review vom 29.09.2026. Geprüfte Repository-Grundlagen sind die ursprüngliche Hetzner-Spezifikation, die genannten ADRs, die betroffenen Implementierungs- und Testpfade, vorhandene Review-Threads sowie der verlinkte CI-Lauf. Ablage und öffentliche Freigabe richten sich nach [Implementation Specs](../specs.md).

Die Primärquellen sind direkt in den jeweiligen Arbeitspaketen verlinkt. Bewahrt bleiben die Architektur- und Sicherheitsgrenzen sowie die vollständigen bisherigen Abnahmekriterien. Präzisiert werden UTF-8-Verarbeitung, Erschöpfung von Antwortbudgets, die Cursor-Anleitung, die Windows-Diagnose und die getrennte Darstellung von technischer Ausführung und Hersteller-Unterstützung.

Offen bleiben die eigentliche Windows-Ursache, die später auszuwählende qualifizierte LiteLLM-/Modell-Kombination, ein gegebenenfalls erforderlicher NixOS-Packaging-Ansatz sowie verfügbare native Testumgebungen und Betreiberfreigaben. Diese offenen Fakten blockieren nur die abhängigen Umsetzungsteile; sie werden nicht durch Annahmen oder Mock-Erfolge ersetzt. Versionsabhängige externe Aussagen sind bei der Umsetzung erneut gegen den tatsächlich installierten Vertrag zu prüfen. Die reine Spezifikationsablage erhebt keinen neuen Provider- oder Client-Laufzeitnachweis.

## 10. Nutzerfreigabe und Artefaktplan

- **Freigegebene Revision:** Änderungsplan v1 für PR #88 vom 29.09.2026, vollständig in der Unterhaltung vorgelegt.
- **Freigabenachweis:** „ja“ auf die abschließende Frage zur öffentlichen Ablage als `docs/specs/hetzner-inference-setup-hardening-spec.md` in PR #88, ausdrücklich ohne Code- oder Infrastrukturänderungen.
- **Inhaltliche Freigabe:** Umfang, Grenzen, Arbeitspakete, Abnahmekriterien, Validierung, Risiken und bedingte Architektur-Gates wie oben beschrieben.
- **Öffentlichkeit:** Die neue Spezifikation ist ausdrücklich zur öffentlichen Ablage freigegeben; sie enthält keine privaten Zugangsdaten oder Betriebsidentitäten.
- **Schreibumfang dieser Ablage:** Genau die neue Spezifikationsdatei auf `codex/hetzner-inference-setup-public`; kein Überschreiben der ursprünglichen Spezifikation, keine neuen Repository-Verzeichnisse, keine ADR-/Index-, Source-, Test-, CI- oder Infrastrukturänderungen.
- **ADR-Persistenz und -Annahme:** Keine neuen ADR-Dateien oder Statusänderungen sind Teil dieser Ablage.
- **Umsetzungsfreigabe:** Noch nicht erteilt; die Planfreigabe selbst genügt dafür nicht.
- **Persistenznachweis:** Der tatsächliche Datei-Commit und sein Readback werden in der Übergabe gemeldet; diese Spezifikation behauptet keinen selbstreferenziellen Abschluss ihrer Veröffentlichung.

## 11. Codex-Übergabe nach gesonderter Umsetzungsfreigabe

> Implementiere die freigegebene Spezifikation `docs/specs/hetzner-inference-setup-hardening-spec.md` für PR #88 in begrenzten Schritten. Prüfe vorher PR-Head, Repository-Anweisungen und die verbindlichen ADRs. Verwende einen zugewiesenen isolierten Worktree und erhalte fremde Änderungen. Beginne mit den reproduzierbaren Fehlerkorrekturen; bearbeite Windows nach dem Prinzip „erst reproduzieren, dann korrigieren“. Erhalte die Sicherheitsgrenzen und bestehenden Abnahmekriterien. Führe Live-Tests und Betreiberänderungen ausschließlich innerhalb einer ausdrücklich freigegebenen Ziel-, Zugangsdaten- und Aktionsgrenze aus. Berichte Codekorrektur, Testnachweis und Merge-Bereitschaft getrennt.
