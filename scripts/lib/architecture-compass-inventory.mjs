// Explicit identities are shared by source validation and installed-payload checks.
// AC-ADR-064 belongs to separate work; a count must not fill that reserved gap.
export const PUBLIC_ARCHITECTURE_ADR_IDS = Object.freeze([
  ...Array.from({ length: 63 }, (_, index) => index + 1),
  65,
]);
