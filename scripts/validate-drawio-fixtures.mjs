import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";

const root = process.cwd();
const validator = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/validate_drawio.py",
);
const strictPreflight = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/preflight-drawio-xml.mjs",
);
const diagramRules = path.join(
  root,
  "skills/engineering-workflows/drawio-diagrams/scripts/validate-drawio-diagram-rules.mjs",
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
    throw new Error(
      `${name}: expected preflight exit ${expectedStatus}, got ${result.status}\n${output}`,
    );
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

function graphModel(cells) {
  return `<mxGraphModel adaptiveColors="auto" dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells}
      </root>
    </mxGraphModel>`;
}

function drawio(cells) {
  return `<mxfile host="app.diagrams.net">
  <diagram name="Regression">
    ${graphModel(cells)}
  </diagram>
</mxfile>
`;
}

function compressedDrawio(cells) {
  const payload = zlib.deflateRawSync(encodeURIComponent(graphModel(cells))).toString("base64");
  return `<mxfile host="app.diagrams.net">
  <diagram name="Compressed Regression">${payload}</diagram>
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

  const compressedForbidden = path.join(temp, "compressed-comment.drawio");
  writeFileSync(
    compressedForbidden,
    `<mxfile host="app.diagrams.net">
  <diagram name="Compressed Forbidden">dY5BCsJADEVPk2VhmhxhbLvyECOJODBthjhKj2/abhTsKo88/k+A4rxOlurjqiwFMCROteW3RC1qT6ALIKZXUx9AA1A01XYQYN91Hrmr3TKzLM6+2N28RilbX+ajI2wFOJ7YfrehJpOl/Qk4fN8df56m4QM=</diagram>
</mxfile>
`,
    "utf8",
  );
  assertPreflight(
    "compressed comment strict parse example",
    compressedForbidden,
    2,
    "compressed diagram payload contains XML comments are forbidden",
  );

  assertNodeRun(
    "diagram rules clean example",
    [diagramRules, path.join(examples, "example-clean.drawio")],
    0,
    "diagram rule error(s)",
  );
  assertNodeRun(
    "diagram rules multi-page example",
    [diagramRules, path.join(examples, "multi-page.drawio")],
    0,
    "0 diagram rule error(s), 0 warning(s)",
  );
  assertNodeRun(
    "browser URL builder",
    [urlOpener, path.join(examples, "example-clean.drawio"), "--print-only"],
    0,
    "https://app.diagrams.net/?grid=0&pv=0&border=10&edit=_blank#create=",
  );

  const floatingEdge = path.join(temp, "floating-edge.drawio");
  writeFileSync(
    floatingEdge,
    drawio(`        <mxCell id="edge" value="Events and artifacts" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "floating semantic edge",
    [diagramRules, floatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const compressedFloatingEdge = path.join(temp, "compressed-floating-edge.drawio");
  writeFileSync(
    compressedFloatingEdge,
    compressedDrawio(`        <mxCell id="edge" value="Compressed events" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "compressed floating semantic edge",
    [diagramRules, compressedFloatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const singleQuotedFloatingEdge = path.join(temp, "single-quoted-floating-edge.drawio");
  writeFileSync(
    singleQuotedFloatingEdge,
    `<mxfile host='app.diagrams.net'>
  <diagram name='Single Quoted'>
    <mxGraphModel adaptiveColors='auto' dx='800' dy='600' grid='1' gridSize='10' page='1' pageScale='1' pageWidth='827' pageHeight='1169' math='0' shadow='0'>
      <root>
        <mxCell id='0'/>
        <mxCell id='1' parent='0'/>
        <mxCell id='edge' value='Single quoted events' style='edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;' edge='1' parent='1'>
          <mxGeometry relative='1' as='geometry'>
            <mxPoint x='40' y='80' as='sourcePoint'/>
            <mxPoint x='300' y='80' as='targetPoint'/>
          </mxGeometry>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`,
    "utf8",
  );
  assertNodeRun(
    "single-quoted floating semantic edge",
    [diagramRules, singleQuotedFloatingEdge],
    1,
    "edge must reference source and target vertex ids",
  );

  const decorativeEdge = path.join(temp, "decorative-edge.drawio");
  writeFileSync(
    decorativeEdge,
    drawio(`        <mxCell id="legend-line" value="Legend" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;dataRole=legend;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="40" y="80" as="sourcePoint"/>
            <mxPoint x="300" y="80" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "decorative floating edge",
    [diagramRules, decorativeEdge],
    0,
    "0 diagram rule error(s)",
  );

  const transparentCalloutCrossing = path.join(temp, "transparent-callout-crossing.drawio");
  writeFileSync(
    transparentCalloutCrossing,
    drawio(`        <mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;" vertex="1" parent="1">
          <mxGeometry x="20" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;" vertex="1" parent="1">
          <mxGeometry x="220" y="40" width="60" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="callout" value="Do not cross" style="text;html=1;strokeColor=none;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="110" y="45" width="80" height="30" as="geometry"/>
        </mxCell>
        <mxCell id="edge" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;" edge="1" parent="1" source="a" target="b">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "transparent text callout crossing",
    [diagramRules, transparentCalloutCrossing],
    0,
    "probable centerline route crosses callout",
  );

  const distortedLogo = path.join(temp, "distorted-logo.drawio");
  writeFileSync(
    distortedLogo,
    drawio(`        <mxCell id="sap_logo" value="SAP" style="shape=image;image=data:image/svg+xml;base64,PHN2Zy8+;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="60" height="60" as="geometry"/>
        </mxCell>`),
    "utf8",
  );
  assertNodeRun(
    "distorted logo guard",
    [diagramRules, distortedLogo],
    1,
    "logos must preserve their original aspect ratio",
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
