"""Opt-in content-loaded Chromium regression checks; no install/server/source writes.
SPDX-License-Identifier: Apache-2.0
Usage: python tests/browser-smoke.py GALLERY_DIRECTORY [CHROMIUM_EXECUTABLE]
Requires installed Playwright Python and Chromium. Does not qualify file/HTTP delivery.
"""
from __future__ import annotations
import base64
import hashlib
import json
import sys
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright


def run(gallery: Path, executable: str | None = None) -> None:
    with sync_playwright() as playwright:
        options = {"headless": True}
        if executable:
            options["executable_path"] = executable
        browser = playwright.chromium.launch(**options)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        network: list[str] = []
        context.on("request", lambda r: network.append(r.url) if r.url.startswith(("http:", "https:")) else None)
        context.route("**/*", lambda route: route.abort())

        def open_html(html: str):
            page = context.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.set_content(html)
            assert page.locator("html").get_attribute("class") == "js", errors
            executable_script = page.locator("script:not([type])").text_content()
            digest = base64.b64encode(hashlib.sha256(executable_script.encode()).digest()).decode()
            assert "sha256-" + digest in page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute("content")
            return page, errors

        def open_report(name: str):
            return open_html((gallery / name / f"{name}.html").read_text(encoding="utf-8"))

        def download_text(page, selector: str):
            with page.expect_download() as info:
                page.locator(selector).click()
            return Path(info.value.path()).read_text(encoding="utf-8")

        def download_json(page, selector="#export-json"):
            return json.loads(download_text(page, selector))

        def nojs_html(html: str, expected: dict):
            nojs = browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
            nojs.route("**/*", lambda route: route.abort())
            page = nojs.new_page()
            page.set_content(html)
            assert json.loads(page.locator("#report-data").text_content()) == expected
            assert page.locator("main section").count() == len(expected["sections"])
            assert page.locator(".agent-ledger").count() == 3
            assert page.locator("#report-markdown").text_content().strip()
            assert page.locator("header .caveat").first.is_visible()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
            if expected.get("editing"):
                assert page.locator("#edit-status").is_visible()
                assert json.loads(page.locator("#report-original").text_content()) == expected["editing"]["original"]
            return nojs, page

        checked = 0
        for index in range(1, 25):
            name = f"r{index:02d}"
            page, errors = open_report(name)
            original = json.loads(page.locator("#report-data").text_content())
            main = page.locator("main").inner_text()
            for style in ("current", "balanced", "calm"):
                page.select_option("#style", style)
                current = download_json(page)
                assert current == dict(original, style=style)
                assert "editing" not in current
                assert page.locator("main").inner_text() == main
                assert page.locator("html").get_attribute("data-style") == style
            assert download_json(page, "#export-original") == original
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), name
            assert not errors, (name, errors)
            exported = download_text(page, "#export-draft")
            nojs, static = nojs_html(exported, dict(original, style="calm"))
            if name == "r22": assert static.locator("tbody tr").count() == 3
            if name == "r09": assert static.locator(".slide:visible").count() == 3
            nojs.close()
            reopened, reopened_errors = open_html(exported)
            assert download_json(reopened) == dict(original, style="calm")
            assert not reopened_errors, (name, reopened_errors)
            reopened.close()
            page.close()
            checked += 1

        page, errors = open_report("r01")
        source = download_json(page)
        page.locator('[data-option-toggle][value="b"]').uncheck()
        page.locator('[data-criterion-toggle][value="latency"]').uncheck()
        assert page.locator('[data-option="b"]:visible').count() == 0
        assert page.locator('[data-criterion="latency"]').is_hidden()
        assert download_json(page) == source
        assert "Variante B" in download_text(page, "#export-md")
        nojs, static = nojs_html(download_text(page, "#export-draft"), source)
        assert static.locator('[data-option="b"]:visible').count() > 0
        assert static.locator('[data-criterion="latency"]').is_visible()
        nojs.close()
        assert not errors
        page.close()

        page, errors = open_report("r22")
        source = download_json(page)
        page.locator("[data-search]").fill("Beta")
        assert page.locator("tbody tr:visible").count() == 1
        nojs, static = nojs_html(download_text(page, "#export-draft"), source)
        assert static.locator("tbody tr:visible").count() == 3
        nojs.close()
        page.locator("[data-search]").fill("")
        page.locator('[data-sort="1"]').click()
        values = page.locator("tbody tr td:nth-child(2)").all_text_contents()
        assert values.index("2") < values.index("10"), values
        assert download_json(page) == source
        assert not errors
        page.close()

        page, errors = open_report("r08")
        source = download_json(page)
        page.get_by_role("button", name="Prüfung starten").click()
        assert page.locator("[data-prototype-state]").inner_text() == "In Prüfung"
        page.get_by_role("button", name="Prüfung abschließen").click()
        assert page.locator("[data-prototype-state]").inner_text() == "Abgeschlossen"
        nojs, static = nojs_html(download_text(page, "#export-draft"), source)
        assert static.locator("[data-prototype-state]").inner_text() == "Bereit"
        nojs.close()
        page.locator("[data-reset-prototype]").click()
        assert page.locator("[data-prototype-state]").inner_text() == "Bereit"
        assert not errors
        page.close()

        page, errors = open_report("r09")
        assert page.locator(".slide:visible").count() == 1
        assert page.locator("[data-presentation]").inner_text() == "Leseansicht"
        page.locator("[data-next]").click()
        assert "Bedingungen" in page.locator(".slide:visible").inner_text()
        assert len(download_json(page)["sections"][0]["data"]["slides"]) == 3
        page.locator("[data-next]").press("ArrowLeft")
        assert "Entscheidung" in page.locator(".slide:visible").inner_text()
        page.locator("[data-next]").press("Escape")
        assert page.locator(".slide:visible").count() == 3
        page.locator("[data-presentation]").click()
        assert page.locator(".slide:visible").count() == 1
        assert not errors
        page.close()

        attack = '</textarea></script><img src=x onerror="globalThis.compromised=true">'
        for name in ("r18", "r19", "r20"):
            page, errors = open_report(name)
            original = download_json(page)
            if name == "r18":
                page.locator('[data-card-index="0"] select').select_option(label="Erledigt")
            elif name == "r19":
                page.locator('[data-flag-index="0"] [data-enabled]').uncheck()
                page.locator('[data-flag-index="0"] [data-rollout]').fill("64")
            else:
                page.locator('[data-prompt-field="user"]').fill(attack)
                page.locator('[data-prompt-field="maxTokens"]').fill("256")
            current = download_json(page)
            assert current["editing"]["original"] == original
            assert all(c["state"] == "user-edited" for c in current["editing"]["changes"])
            assert download_json(page, "#export-original") == original
            markdown = download_text(page, "#export-md")
            assert "Nutzerbearbeitung" in markdown and "Original snapshot" in markdown
            exported = download_text(page, "#export-draft")
            nojs, static = nojs_html(exported, current)
            assert static.locator("#report-markdown").text_content() == markdown
            if name == "r18":
                assert static.locator('[data-column="Erledigt"] [data-card-index="0"]').count() == 1
                assert "Erledigt" in static.locator('[data-card-index="0"] [data-card-status]').inner_text()
            elif name == "r19":
                assert static.locator('[data-flag-index="0"] [data-flag-status]').inner_text() == "Aus"
                assert static.locator('[data-flag-index="0"] [data-rollout-value]').inner_text() == "64%"
            else:
                assert static.locator('[data-prompt-field="user"]').text_content() == attack
                assert static.locator('[data-prompt-field="maxTokens"]').get_attribute("value") == "256"
                assert static.locator("main img").count() == 0
            nojs.close()
            reopened, re_errors = open_html(exported)
            assert download_json(reopened) == current
            assert download_json(reopened, "#export-original") == original
            assert reopened.evaluate("globalThis.compromised === undefined")
            if name == "r20":
                reopened.locator('[data-prompt-field="system"]').fill("Zweite Nutzerbearbeitung")
                second = download_json(reopened)
                assert second["editing"]["original"] == original
                assert "editing" not in second["editing"]["original"]
                assert len(second["editing"]["changes"]) == 3
                reopened.locator('[data-prompt-field="temperature"]').fill("3")
                downloads = []
                reopened.on("download", lambda d: downloads.append(d))
                reopened.locator("#export-json").click()
                assert "Export blockiert" in reopened.locator("#report-status").inner_text()
                assert not downloads
                reopened.locator('[data-prompt-field="temperature"]').fill("")
                reopened.locator("#export-json").click()
                assert "Export blockiert" in reopened.locator("#report-status").inner_text()
                assert not downloads
            assert not re_errors, (name, re_errors)
            assert not errors, (name, errors)
            reopened.close()
            page.close()

        # Mixed compositions must retain hidden data while materializing editor changes.
        with tempfile.TemporaryDirectory(prefix="visual-report-browser-") as tmp:
            tmp = Path(tmp)
            model = json.loads((gallery / "r01/r01.json").read_text(encoding="utf-8"))
            model["id"] = "mixed"
            model["sections"] = [model["sections"][0]]
            for name in ("r22", "r18", "r19", "r20", "r09", "r08"):
                model["sections"] += json.loads((gallery / name / f"{name}.json").read_text(encoding="utf-8"))["sections"]
            source_file = tmp / "input.json"
            source_file.write_text(json.dumps(model), encoding="utf-8")
            cli = Path(__file__).resolve().parents[1] / "scripts/render-report.mjs"
            subprocess.run(["node", str(cli), "--input", str(source_file), "--output", str(tmp / "out")], check=True, capture_output=True)
            page, errors = open_html((tmp / "out/mixed.html").read_text(encoding="utf-8"))
            assert page.locator(".slide:visible").count() == 3  # no explicit presentation intent
            page.locator('[data-option-toggle][value="b"]').uncheck()
            page.locator("[data-search]").fill("Beta")
            page.locator('[data-card-index="0"] select').select_option(label="Erledigt")
            page.locator('[data-prompt-field="user"]').fill("Gemischter aktueller Stand")
            current = download_json(page)
            assert len(current["editing"]["changes"]) == 2
            exported = download_text(page, "#export-draft")
            nojs, static = nojs_html(exported, current)
            assert static.locator('[data-option="b"]:visible').count() > 0
            assert static.locator('[data-kind="table"] tbody tr:visible').count() == 3
            assert static.locator('[data-column="Erledigt"] [data-card-index="0"]').count() == 1
            assert static.locator('[data-prompt-field="user"]').text_content() == "Gemischter aktueller Stand"
            assert static.locator(".slide:visible").count() == 3
            assert current["editing"]["original"] == model
            nojs.close()
            assert not errors
            page.close()

        page, errors = open_report("r07")
        assert page.evaluate("document.getAnimations().length") == 0
        page.locator("[data-duration]").fill("5000")
        page.locator("[data-play]").click()
        assert page.evaluate("document.getAnimations().length") > 0
        page.locator("[data-pause]").click()
        assert page.evaluate("document.getAnimations()[0].playState") == "paused"
        page.locator("[data-pause]").click()
        assert page.evaluate("document.getAnimations()[0].playState") == "running"
        exported = download_text(page, "#export-draft")
        reopened, re_errors = open_html(exported)
        assert reopened.evaluate("document.getAnimations().length") == 0
        assert not re_errors
        reopened.close()
        page.locator("[data-stop]").click()
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_timeout(80)
        assert page.locator("[data-play]").is_disabled()
        assert page.evaluate("document.getAnimations().length") == 0
        assert not errors
        page.close()
        assert not network, network
        context.close()
        browser.close()
    print(f"PASS: {checked}/24 recipes; three styles, mobile containment, no-JS current exports, CSP/reopening, filter completeness, source-preserving editor exports/re-edits, slides-first/manual navigation, motion pause/reset/reduced motion; no HTTP(S) requests. Content-loaded Chromium only.")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    run(Path(sys.argv[1]).resolve(), sys.argv[2] if len(sys.argv) == 3 else None)
