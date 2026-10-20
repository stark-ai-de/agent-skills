"""Opt-in browser qualification; no installation, server, repository writes or network.
SPDX-License-Identifier: Apache-2.0
Usage: python tests/browser-smoke.py GALLERY_DIRECTORY [CHROMIUM_EXECUTABLE]
Requires an already available Playwright Python package and Chromium.
HTML is loaded with set_content; this does NOT qualify a file:// or HTTP delivery route.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright


def run(gallery: Path, executable: str | None = None) -> None:
    checked = 0
    with sync_playwright() as playwright:
        options = {"headless": True}
        if executable:
            options["executable_path"] = executable
        browser = playwright.chromium.launch(**options)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        network: list[str] = []
        context.on("request", lambda request: network.append(request.url) if request.url.startswith(("http:", "https:")) else None)
        context.route("**/*", lambda route: route.abort())

        def open_report(name: str):
            page = context.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_content((gallery / name / f"{name}.html").read_text(encoding="utf-8"))
            assert page.locator("html").get_attribute("class") == "js", name
            return page, errors

        def download_json(page, selector: str):
            with page.expect_download() as info:
                page.locator(selector).click()
            return json.loads(Path(info.value.path()).read_text(encoding="utf-8"))

        for index in range(1, 25):
            name = f"r{index:02d}"
            page, errors = open_report(name)
            original = page.locator("#report-data").text_content()
            main = page.locator("main").inner_text()
            for style in ("current", "balanced", "calm"):
                page.select_option("#style", style)
                assert page.locator("html").get_attribute("data-style") == style
                assert page.locator("#report-data").text_content() == original
                assert page.locator("main").inner_text() == main
            assert download_json(page, "#export-json") == json.loads(original)
            page.set_viewport_size({"width": 390, "height": 844})
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), name
            assert page.locator("header .caveat").is_visible(), name
            assert not errors, (name, errors)
            page.close()
            nojs = browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
            static = nojs.new_page()
            static.set_content((gallery / name / f"{name}.html").read_text(encoding="utf-8"))
            assert static.locator("main section").count() > 0
            assert static.locator("noscript").is_visible()
            assert static.locator(".agent-ledger").count() == 2
            assert static.locator("#report-markdown").text_content().strip()
            if name == "r22": assert static.locator("tbody tr").count() == 3
            if name == "r09": assert static.locator(".slide:visible").count() == 3
            nojs.close()
            checked += 1

        page, errors = open_report("r01")
        source = json.loads(page.locator("#report-data").text_content())
        page.locator('[data-option-toggle][value="b"]').uncheck()
        assert page.locator('[data-option="b"]:visible').count() == 0
        page.locator('[data-criterion-toggle][value="latency"]').uncheck()
        assert page.locator('[data-criterion="latency"]').is_hidden()
        assert download_json(page, "#export-json") == source
        with page.expect_download() as info: page.locator("#export-md").click()
        assert "Variante B" in Path(info.value.path()).read_text(encoding="utf-8")
        assert not errors
        page.close()

        page, errors = open_report("r22")
        page.locator("[data-search]").fill("Beta")
        assert page.locator("tbody tr:visible").count() == 1
        page.locator("[data-search]").fill("")
        page.locator('[data-sort="1"]').click()
        values = page.locator("tbody tr td:nth-child(2)").all_text_contents()
        assert values.index("2") < values.index("10"), values
        assert not errors
        page.close()

        page, errors = open_report("r08")
        page.get_by_role("button", name="Prüfung starten").click()
        assert page.locator("[data-prototype-state]").inner_text() == "In Prüfung"
        page.get_by_role("button", name="Prüfung abschließen").click()
        assert page.locator("[data-prototype-state]").inner_text() == "Abgeschlossen"
        page.locator("[data-reset-prototype]").click()
        assert page.locator("[data-prototype-state]").inner_text() == "Bereit"
        assert not errors
        page.close()

        page, errors = open_report("r09")
        page.locator("[data-presentation]").click()
        page.locator("[data-next]").click()
        assert page.locator(".slide:visible").count() == 1
        assert "Bedingungen" in page.locator(".slide:visible").inner_text()
        page.locator("[data-next]").press("ArrowLeft")
        assert "Entscheidung" in page.locator(".slide:visible").inner_text()
        page.locator("[data-next]").press("Escape")
        assert page.locator(".slide:visible").count() == 3
        assert not errors
        page.close()

        page, errors = open_report("r18")
        page.locator('[data-card-index="0"] select').select_option(label="Erledigt")
        assert page.locator('[data-column="Erledigt"] [data-card-index="0"]').count() == 1
        draft = download_json(page, "#export-draft")
        assert draft["sections"][0]["data"]["cards"][0]["column"] == "Erledigt"
        assert draft["draft"]["localOnly"] is True
        assert download_json(page, "#export-json")["sections"][0]["data"]["cards"][0]["column"] == "Backlog"
        assert not errors
        page.close()

        page, errors = open_report("r19")
        page.locator('[data-flag-index="0"] [data-enabled]').uncheck()
        draft = download_json(page, "#export-draft")
        assert draft["sections"][0]["data"]["flags"][0]["enabled"] is False
        assert download_json(page, "#export-json")["sections"][0]["data"]["flags"][0]["enabled"] is True
        assert not errors
        page.close()

        page, errors = open_report("r20")
        attack = '</script><img src=x onerror="globalThis.compromised=true">'
        page.locator('[data-prompt-field="user"]').fill(attack)
        draft = download_json(page, "#export-draft")
        assert draft["sections"][0]["data"]["user"] == attack
        assert page.locator("[data-prompt-preview]").inner_text().find("compromised") >= 0
        assert page.evaluate("globalThis.compromised === undefined")
        assert page.locator("main img").count() == 0
        assert not errors
        page.close()

        page, errors = open_report("r07")
        assert page.evaluate("document.getAnimations().length") == 0
        page.locator("[data-play]").click()
        assert page.evaluate("document.getAnimations().length") > 0
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
    print(f"PASS: {checked}/24 recipes; 3 styles, 390px containment, no-JS, complete downloads, comparison/table/prototype/slides/editors/motion; no HTTP(S) requests. Content-loaded Chromium, not delivery-route verification.")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    run(Path(sys.argv[1]).resolve(), sys.argv[2] if len(sys.argv) == 3 else None)
