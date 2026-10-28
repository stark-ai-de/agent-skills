import {
  AbsoluteFill,
  Composition,
  Sequence,
  Track,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import rows from "./evidence.json";
const ink = "#10151f",
  paper = "#f0f2f4",
  blue = "#0021c7",
  mint = "#b8f2d0";
const font = "Arial, Helvetica, sans-serif";
export const Opening = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: blue,
        color: "white",
        fontFamily: font,
        padding: 100,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 27,
          letterSpacing: 5,
          opacity: interpolate(f, [0, 0.7 * fps], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        STARK AI / DEVELOPER TOOLS
      </div>
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 1.03,
          letterSpacing: -6,
          margin: "40px 0",
          translate: interpolate(f, [0, 1.2 * fps], ["0px 70px", "0px 0px"], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        Your metadata.
        <br />
        Every result, visible.
      </div>
      <div style={{ fontSize: 36, maxWidth: 1200, lineHeight: 1.4 }}>
        Two validation tools. Eight review scenarios.
        <br />
        Actual recorded responses from the production MCP.
      </div>
      <div style={{ position: "absolute", bottom: 90, fontSize: 25 }}>
        PLUGIN 1.0.0 · NO AUTH · SYNTHETIC INPUTS ONLY
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 12,
          width: interpolate(f, [0, 8 * fps], [0, 1920]),
          background: mint,
        }}
      />
    </AbsoluteFill>
  );
};
export const Evidence = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const index = Math.min(rows.length - 1, Math.floor(f / (6 * fps)));
  const row = rows[index];
  const local = f - index * 6 * fps;
  const valid = (row.response as { valid?: boolean }).valid;
  const verdict =
    row.id === "N3"
      ? "ARGUMENTS REJECTED"
      : valid === true
        ? "VALID"
        : valid === false
          ? "ISSUES REPORTED"
          : "CONNECTED";
  return (
    <AbsoluteFill style={{ background: paper, color: ink, fontFamily: font }}>
      <div
        style={{ position: "absolute", top: 0, left: 0, width: 1920, height: 12, background: blue }}
      />
      <div
        style={{
          padding: "48px 70px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #bac0ca",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          stark AI Developer Tools{" "}
          <span style={{ fontWeight: 400, color: "#646e80" }}> / MCP review</span>
        </div>
        <div style={{ fontSize: 22, color: "#526076" }}>
          RECORDED PRODUCTION RESPONSES · {index + 1} / {rows.length}
        </div>
      </div>
      <div style={{ position: "absolute", top: 155, left: 70, width: 310 }}>
        <div style={{ fontSize: 18, letterSpacing: 3, color: "#626e81", marginBottom: 30 }}>
          REVIEW CHAPTERS
        </div>
        {[
          ["CONNECT", "Connection"],
          ["TOOLS", "Tool discovery"],
          ["P1", "Minimal metadata"],
          ["P2", "Optional fields"],
          ["P3", "Portable manifest"],
          ["P4", "OpenAI manifest"],
          ["P5", "Correct & revalidate"],
          ["N1", "Missing / mismatch"],
          ["N2", "Parse / schema errors"],
          ["N3", "Unsupported actions"],
        ].map(([id, title]) => (
          <div
            key={id}
            style={{
              padding: "12px 15px",
              minHeight: 56,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 19,
              background: row.id === id ? blue : "transparent",
              color: row.id === id ? "white" : "#677182",
              borderRadius: 5,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                display: "inline-block",
                minWidth: 68,
              }}
            >
              {id}
            </span>
            {title}
          </div>
        ))}
        <div style={{ fontSize: 21, lineHeight: 1.5, marginTop: 35, color: "#626e81" }}>
          Input-only computation.
          <br />
          No file, URL or shell actions.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 155,
          left: 430,
          right: 70,
          opacity: interpolate(local, [0, 0.25 * fps], [0.15, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, color: blue, fontWeight: 700, letterSpacing: 2 }}>
            {row.id} {"step" in row ? row.step : ""}
          </div>
          <div
            style={{
              background: mint,
              padding: "10px 20px",
              borderRadius: 4,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {verdict}
          </div>
        </div>
        <h1 style={{ fontSize: 51, letterSpacing: -1.7, margin: "18px 0" }}>{row.title}</h1>
        <p
          style={{
            fontSize: 24,
            lineHeight: 1.4,
            color: "#526076",
            height: 83,
            margin: "0 0 25px",
          }}
        >
          {row.detail}
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              width: "51%",
              height: 520,
              background: "white",
              padding: 24,
              border: "1px solid #c3cad4",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 17, letterSpacing: 2, color: "#687488" }}>SUPPLIED REQUEST</div>
            <pre
              style={{
                fontSize: 21,
                lineHeight: 1.36,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                maxHeight: 445,
                overflow: "hidden",
              }}
            >
              {JSON.stringify(row.request, null, 2)}
            </pre>
          </div>
          <div
            style={{
              width: "49%",
              height: 520,
              background: ink,
              color: paper,
              padding: 24,
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 17, letterSpacing: 2, color: mint }}>
              ACTUAL SERVER RESPONSE
            </div>
            <pre
              style={{
                fontSize: 21,
                lineHeight: 1.36,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                maxHeight: 445,
                overflow: "hidden",
              }}
            >
              {JSON.stringify(row.response, null, 2)}
            </pre>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 55,
          left: 430,
          right: 70,
          fontSize: 20,
          color: "#687488",
        }}
      >
        skills-mcp.stark-ai.de/mcp · Read-only review of supplied metadata · No ChatGPT or portal UI
        is simulated
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          height: 8,
          left: 0,
          width: (f / (90 * fps)) * 1920,
          background: blue,
        }}
      />
    </AbsoluteFill>
  );
};
export const Closing = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: ink,
        color: paper,
        fontFamily: font,
        padding: 100,
        justifyContent: "center",
      }}
    >
      <div style={{ color: mint, fontSize: 28, letterSpacing: 4 }}>REVIEW COMPLETE</div>
      <h1 style={{ fontSize: 100, lineHeight: 1.05, letterSpacing: -4, margin: "35px 0" }}>
        8 scenarios.
        <br />
        13 actual tool calls.
      </h1>
      <div style={{ fontSize: 34, lineHeight: 1.6 }}>
        Five positive cases. Three negative cases.
        <br />
        Deterministic results. No account or payment flow.
      </div>
      <div
        style={{
          width: interpolate(f, [0, 1.5 * fps], [0, 1600], { extrapolateRight: "clamp" }),
          height: 2,
          background: "#526076",
          margin: "40px 0",
        }}
      />
      <div style={{ fontSize: 26, lineHeight: 1.5, color: "#b3bdcc", maxWidth: 1480 }}>
        Metadata validation does not establish ZIP safety or publication eligibility.
        <br />
        This evidence replay is based on the real standalone-client recording.
        <br />
        Native installation and ChatGPT model refusal require separate verification.
      </div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 23, color: mint }}>
        stark-ai-de.github.io/agent-skills/privacy/ · servrox solutions UG
      </div>
    </AbsoluteFill>
  );
};
export const Walkthrough = () => {
  const { fps } = useVideoConfig();
  return (
    <Track name="Review walkthrough">
      <Sequence name="Opening" durationInFrames={8 * fps}>
        <Opening />
      </Sequence>
      <Sequence name="Actual MCP evidence" from={8 * fps} durationInFrames={90 * fps}>
        <Evidence />
      </Sequence>
      <Sequence name="Results and boundaries" from={98 * fps} durationInFrames={10 * fps}>
        <Closing />
      </Sequence>
    </Track>
  );
};
export const MyComposition = () => (
  <>
    <Composition
      id="Walkthrough"
      component={Walkthrough}
      durationInFrames={3240}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="Opening"
      component={Opening}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="Evidence"
      component={Evidence}
      durationInFrames={2700}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="Closing"
      component={Closing}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
