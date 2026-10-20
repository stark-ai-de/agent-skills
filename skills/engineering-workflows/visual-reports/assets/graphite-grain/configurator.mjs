import { readFile } from "node:fs/promises";

export const defaultSettings = {
  fontSize: 13,
  headingGap: 8,
  lineHeight: 1.65,
  spacing: 0,
  grain: 0.03,
  depth: 0.4,
  softness: 0,
  lines: 100,
  radius: 0,
  accent: 100,
};
export function normalizeSettings(input) {
  const limits = {
    fontSize: [12, 16],
    headingGap: [2, 8],
    lineHeight: [1.5, 2],
    spacing: [0, 100],
    grain: [0, 0.06],
    depth: [0, 0.8],
    softness: [0, 100],
    lines: [0, 100],
    radius: [0, 10],
    accent: [0, 100],
  };
  const defaults = {
    fontSize: 13,
    headingGap: 8,
    lineHeight: 1.65,
    spacing: 0,
    grain: 0.03,
    depth: 0.4,
    softness: 0,
    lines: 100,
    radius: 0,
    accent: 100,
  };
  return Object.fromEntries(
    Object.entries(limits).map(([key, [min, max]]) => {
      const n = Number(input?.[key] ?? defaults[key]);
      return [key, Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaults[key]];
    }),
  );
}
export function blendSettings(percent) {
  const mix = Math.min(1, Math.max(0, Number(percent) / 100));
  const a = {
    fontSize: 13,
    headingGap: 8,
    lineHeight: 1.65,
    spacing: 0,
    grain: 0.03,
    depth: 0.4,
    softness: 0,
    lines: 100,
    radius: 0,
    accent: 100,
  };
  const b = {
    fontSize: 13,
    headingGap: 6,
    lineHeight: 1.8,
    spacing: 65,
    grain: 0.012,
    depth: 0.2,
    softness: 100,
    lines: 25,
    radius: 6,
    accent: 35,
  };
  return Object.fromEntries(
    Object.keys(a).map((key) => [key, Number((a[key] + (b[key] - a[key]) * mix).toFixed(3))]),
  );
}
export function settingsCss(input) {
  const c = normalizeSettings(input),
    s = c.softness / 100,
    a = c.accent / 100,
    p = c.spacing / 100;
  const rgb = (left, right, t) =>
    `rgb(${left.map((v, i) => Math.round(v + (right[i] - v) * t)).join(" ")})`;
  const css = [
    `:root{--demo-font:${c.fontSize}px;--grain-level:${c.grain};--shadow-level:${c.depth}}`,
  ];
  if (c.headingGap !== 8)
    css.push(
      `.demo-section h1,#view-comparison h1{font-size:calc(var(--demo-font) + ${c.headingGap}px)}.demo-section h2{font-size:calc(var(--demo-font) + ${Math.min(c.headingGap, 3)}px)}`,
    );
  if (c.lineHeight !== 1.65)
    css.push(`body,.rule-row>summary,.product>summary{line-height:${c.lineHeight}}`);
  if (c.spacing !== 0)
    css.push(
      `.demo-section{padding:${24 + 6 * p}px ${20 + 8 * p}px}.workspace{padding:${16 + 10 * p}px ${20 + 8 * p}px ${24 + 8 * p}px;gap:${24 + 10 * p}px}.masthead{padding:${16 + 4 * p}px ${20 + 8 * p}px}.rule-row{padding:${16 + 7 * p}px 0}.rule-row>summary{gap:${20 + 8 * p}px}.product>summary{padding:${20 + 7 * p}px 0}@media(max-width:740px){.demo-section,.workspace{padding:${20 + 6 * p}px ${16 + 4 * p}px}.rule-row>summary{gap:7px}}`,
    );
  if (s > 0)
    css.push(
      `:root{--bg:${rgb([28, 29, 31], [34, 36, 38], s)};--ink:${rgb([238, 239, 237], [229, 231, 227], s)};--muted:${rgb([177, 178, 180], [189, 194, 189], s)};--quiet:${rgb([146, 149, 152], [165, 171, 167], s)}}.demo-section h1,#view-comparison h1{font-weight:400}.rule-row>summary>span:last-child{color:var(--muted)}.product>summary>span:not(.name),.product>summary .limit{color:var(--muted)}.demo-tabs button[aria-pressed=true],.demo-buttons button[aria-pressed=true]{background:rgb(255 255 255 / ${s * 0.03})}.offen,.warning{color:${rgb([255, 150, 155], [230, 184, 184], s)}}`,
    );
  if (c.lines !== 100)
    css.push(
      `:root{--line:rgb(255 255 255 / ${c.lines * 0.0014})}.product,.rule-row,.demo-tabs,.display-tools,.columns,.source-document,.flow-path,#export-data,footer{border-color:var(--line)}`,
    );
  if (c.radius !== 0)
    css.push(
      `button:not([data-category]),.rule-row[open],.product[open]>.product-details{border-radius:${c.radius}px}`,
    );
  if (c.accent !== 100)
    css.push(
      `:root{--green:${rgb([187, 217, 173], [136, 255, 116], a)};--yellow:${rgb([223, 207, 154], [255, 226, 100], a)};--red:${rgb([223, 169, 169], [255, 93, 101], a)}}.belegt{color:var(--green)}.angenommen,.teilbelegt,.redaktionell_geschaetzt,.fiction{color:var(--yellow)}.square,.circle,.triangle{box-shadow:none;filter:none}`,
    );
  return css.join("\n");
}
export function configuredReport(base, settings) {
  const c = normalizeSettings(settings);
  const config = { kind: "graphite-grain-config", version: 1, settings: c };
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return base
    .replace("</style>", () => `${settingsCss(c)}</style>`)
    .replace('id="font-size" type="range" min="13"', 'id="font-size" type="range" min="12"')
    .replace('step="0.005"', 'step="0.001"')
    .replace('step="0.1" value=', 'step="0.01" value=')
    .replace(/id="grain-level"([^>]*?)value="[^"]*"/, `id="grain-level"$1value="${c.grain}"`)
    .replace(/id="shadow-level"([^>]*?)value="[^"]*"/, `id="shadow-level"$1value="${c.depth}"`)
    .replace(/id="font-size"([^>]*?)value="[^"]*"/, `id="font-size"$1value="${c.fontSize}"`)
    .replace(/id="font-size-output">[^<]*/, `id="font-size-output">${c.fontSize} px`)
    .replace(
      /getElementById\('grain-level'\)\.value='[^']*'/,
      `getElementById('grain-level').value='${c.grain}'`,
    )
    .replace(
      /getElementById\('shadow-level'\)\.value='[^']*'/,
      `getElementById('shadow-level').value='${c.depth}'`,
    )
    .replace(
      /getElementById\('font-size'\)\.value='[^']*'/,
      `getElementById('font-size').value='${c.fontSize}'`,
    )
    .replace(
      "</body>",
      `<script id="report-configuration" type="application/json">${json}</script></body>`,
    );
}
export async function renderConfigurator(base, fingerprint) {
  const template = await readFile(new URL("./configurator.html", import.meta.url), "utf8");
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const bridge = `<style id="live-settings">.display-tools{display:none!important}</style><script>addEventListener('message',event=>{if(event.source!==parent||event.data?.kind!=='graphite-settings'||typeof event.data.css!=='string'||event.data.css.length>20000)return;document.getElementById('live-settings').textContent=event.data.css+' .display-tools{display:none!important}';for(const key of ['--grain-level','--shadow-level','--demo-font'])document.documentElement.style.removeProperty(key)});</script>`;
  const preview = configuredReport(base, defaultSettings).replace("</body>", `${bridge}</body>`);
  return template
    .replace("{{FONT}}", base.match(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/)[0])
    .replace("{{PREVIEW}}", () => escape(preview))
    .replace("{{SOURCE}}", () =>
      JSON.stringify({ base, fingerprint, defaults: defaultSettings }).replace(/</g, "\\u003c"),
    )
    .replace("/* CONFIG_FUNCTIONS */", () =>
      [normalizeSettings, blendSettings, settingsCss, configuredReport]
        .map((f) => f.toString().replace(/<\/script/gi, "<\\/script"))
        .join("\n"),
    );
}
