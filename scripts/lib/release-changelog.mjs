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

function changelogSections(text) {
  const headings = [...text.matchAll(/^##\s+(\S.*)$/gm)]
    .map((match) => ({
      key:
        changelogHeadingVersion(match[1]) ??
        (/^Unreleased\b/i.test(match[1].trim()) ? "Unreleased" : null),
      unsupportedVersion: /^(?:v?\d|\[v?\d)/i.test(match[1].trim()),
      start: match.index,
    }))
    // Keep unsupported version headings as boundaries so release validation
    // cannot remove them together with an otherwise valid inserted release.
    .filter((heading) => heading.key !== null || heading.unsupportedVersion);
  return headings.map((heading, index) => ({
    ...heading,
    end: headings[index + 1]?.start ?? text.length,
  }));
}

export function splitChangelogSections(text) {
  const sections = new Map();
  if (!text) return sections;
  for (const section of changelogSections(text)) {
    if (section.key === null) continue;
    sections.set(section.key, normalizeChangelogSection(text.slice(section.start, section.end)));
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
  const matches = changelogSections(text).filter((section) => section.key === version);
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
