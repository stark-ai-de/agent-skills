export function containsKnownSkillInvocationToken(text, knownSkillNames) {
  if (typeof text !== "string" || !text) return false;

  const names = knownSkillNames instanceof Set ? knownSkillNames : new Set(knownSkillNames);
  const completeTokenPattern =
    /(^|[^\p{L}\p{N}_$-])\$([a-z0-9]+(?:-[a-z0-9]+)*)(?![\p{L}\p{N}_-])/gu;

  for (const match of text.matchAll(completeTokenPattern)) {
    if (names.has(match[2])) return true;
  }

  return false;
}
