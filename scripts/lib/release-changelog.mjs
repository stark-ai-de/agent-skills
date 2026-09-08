export function changelogHeadingVersion(heading) {
  const normalized = heading.trim();
  return (
    /^v?(\d+\.\d+\.\d+)(?:\s|$)/.exec(normalized)?.[1] ??
    /^\[(\d+\.\d+\.\d+)\]\([^)]*\)(?:\s|$)/.exec(normalized)?.[1] ??
    null
  );
}

export function normalizeChangelogSection(text) {
  return `${text.replace(/[ \t]+$/gm, "").trim()}\n`;
}

export function splitChangelogSections(text) {
  const sections = new Map();
  if (!text) return sections;
  for (const chunk of text.split(/^(?=## )/m)) {
    const heading = chunk.match(/^##\s+(\S.*)$/m)?.[1]?.trim();
    if (!heading) continue;
    const normalized = normalizeChangelogSection(chunk);
    const version = changelogHeadingVersion(heading);
    if (version) sections.set(version, normalized);
    else if (/^Unreleased\b/i.test(heading)) sections.set("Unreleased", normalized);
  }
  return sections;
}

export function changelogReleaseVersions(text) {
  return new Set([...splitChangelogSections(text).keys()].filter((key) => key !== "Unreleased"));
}

export function changelogReleaseOrder(text) {
  if (!text) return [];
  const versions = [];
  for (const match of text.matchAll(/^##\s+(\S.*)$/gm)) {
    const version = changelogHeadingVersion(match[1]);
    if (version) versions.push(version);
  }
  return versions;
}

export function removeChangelogReleaseSection(text, version) {
  if (!text || !/^\d+\.\d+\.\d+$/.test(version ?? "")) return null;
  const headings = [...text.matchAll(/^##\s+(\S.*)$/gm)].map((match) => ({
    heading: match[1],
    start: match.index,
  }));
  const matches = headings
    .map((heading, index) => ({
      ...heading,
      end: headings[index + 1]?.start ?? text.length,
    }))
    .filter((heading) => changelogHeadingVersion(heading.heading) === version);
  if (matches.length !== 1) return null;
  const [section] = matches;
  return `${text.slice(0, section.start)}${text.slice(section.end)}`;
}

export function extractChangelogReleaseNotes(text, version) {
  const sections = splitChangelogSections(text);
  const section = sections.get(version);
  if (!section) return null;
  const lines = section.trimEnd().split("\n");
  return lines.slice(1).join("\n").trim();
}
