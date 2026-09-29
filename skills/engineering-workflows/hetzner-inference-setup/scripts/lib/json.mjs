import crypto from "node:crypto";

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

export function stableJson(value, spacing = 2) {
  return `${JSON.stringify(normalize(value), null, spacing)}\n`;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function digestJson(value) {
  return sha256(stableJson(value, 0));
}

export function withoutKeys(value, keys) {
  const copy = structuredClone(value);
  for (const key of keys) delete copy[key];
  return copy;
}
