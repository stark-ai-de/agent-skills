import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const validator = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
);
const strictPreflight = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/preflight-drawio-xml.mjs",
);
const examples = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/references/examples",
);
const urlOpener = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/open-drawio-url.mjs",
);

function run(file) {
  return spawnSync("python3", [validator, file], {
    cwd: root,
    encoding: "utf8",
  });
}

function runPreflight(file) {
  return spawnSync("node", [strictPreflight, file], {
    cwd: root,
    encoding: "utf8",
  });
}

function assertRun(name, file, expectedStatus, expectedOutput) {
  const result = run(file);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  if (expectedOutput && !output.includes(expectedOutput)) {
    throw new Error(
      `${name}: expected output to include ${JSON.stringify(expectedOutput)}\n${output}`,
    );
  }
}

function assertPreflight(name, file, expectedStatus, expectedOutput) {
  const result = runPreflight(file);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected preflight exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  if (expectedOutput && !output.includes(expectedOutput)) {
    throw new Error(
      `${name}: expected preflight output to include ${JSON.stringify(expectedOutput)}\n${output}`,
    );
  }
}

function assertNodeRun(name, args, expectedStatus, expectedOutput) {
  const result = spawnSync("node", args, {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected exit ${expectedStatus}, got ${result.status}\n${output}`);
  }
  if (expectedOutput && !output.includes(expectedOutput)) {
    throw new Error(
      `${name}: expected output to include ${JSON.stringify(expectedOutput)}\n${output}`,
    );
  }
}

function drawio(cells) {
  return `<mxfile host="app.diagrams.net">
  <diagram name="Regression">
    <mxGraphModel adaptiveColors="auto" dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

const temp = mkdtempSync(path.join(tmpdir(), "drawio-validator-"));

try {
  assertRun("clean example", path.join(examples, "example-clean.drawio"), 0);
  assertRun("architecture icons example", path.join(examples, "architecture-icons.drawio"), 0);
  assertRun("icon catalog smoke example", path.join(examples, "icon-catalog-smoke.drawio"), 0);
  assertRun("existing edit before example", path.join(examples, "existing-edit-before.drawio"), 0);
  assertRun("existing edit after example", path.join(examples, "existing-edit-after.drawio"), 0);
  assertRun("multi-page example", path.join(examples, "multi-page.drawio"), 0);
  assertRun("broken example", path.join(examples, "example-broken.drawio"), 1, "duplicate id");
  assertRun(
    "contrast example",
    path.join(examples, "example-contrast-broken.drawio"),
    1,
    "text/fill contrast below 4.5:1",
  );
  assertPreflight(
    "comment strict parse example",
    path.join(examples, "example-comment-broken.drawio"),
    2,
    "XML comments are forbidden",
  );
  assertPreflight(
    "doctype strict parse example",
    path.join(examples, "example-doctype-broken.drawio"),
    2,
    "DOCTYPE declarations are forbidden",
  );
  assertPreflight(
    "processing instruction strict parse example",
    path.join(examples, "example-processing-instruction-broken.drawio"),
    2,
    "processing instructions are forbidden",
  );

  assertNodeRun(
    "browser URL builder",
    [urlOpener, path.join(examples, "example-clean.drawio"), "--print-only"],
    0,
    "https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create=",
  );

  const missingEdgeAs = path.join(temp, "missing-edge-as.drawio");
  writeFileSync(
    missingEdgeAs,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "edge geometry as attribute",
    missingEdgeAs,
    1,
    'edge missing <mxGeometry relative="1" as="geometry"/>',
  );

  const missingVertexAs = path.join(temp, "missing-vertex-as.drawio");
  writeFileSync(
    missingVertexAs,
    drawio(`        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60"/>
        </mxCell>`),
    "utf8",
  );
  assertRun(
    "vertex geometry as attribute",
    missingVertexAs,
    1,
    'vertex missing <mxGeometry as="geometry"/>',
  );

  const malformedRootLayer = path.join(temp, "malformed-root-layer.drawio");
  writeFileSync(
    malformedRootLayer,
    `<mxfile host="app.diagrams.net">
  <diagram name="Regression">
    <mxGraphModel adaptiveColors="auto" dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1"/>
        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`,
    "utf8",
  );
  assertRun("malformed root layer", malformedRootLayer, 1, '<mxCell id="1"/> must set parent="0"');

  const missingVertexDimensions = path.join(temp, "missing-vertex-dimensions.drawio");
  writeFileSync(
    missingVertexDimensions,
    drawio(`        <mxCell id="node" value="Node" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("vertex dimensions", missingVertexDimensions, 1, "vertex has no usable mxGeometry");

  const inlineFontSize = path.join(temp, "inline-font-size.drawio");
  writeFileSync(
    inlineFontSize,
    drawio(`        <mxCell id="node" value="&lt;span style=&quot;font-size:8px&quot;&gt;Tiny&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;fontColor=#1f2937;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="160" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("inline font-size", inlineFontSize, 0, "inline font-size 8px below 9");

  const fixedFillAdaptiveFont = path.join(temp, "fixed-fill-adaptive-font.drawio");
  writeFileSync(
    fixedFillAdaptiveFont,
    drawio(`        <mxCell id="node" value="Mixed contrast" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;fontColor=light-dark(#111111,#eeeeee);" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="180" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertRun("fixed fill adaptive font", fixedFillAdaptiveFont, 1, "#eeeeee on #ffffff");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Validated draw.io examples and validator regression fixtures.");
