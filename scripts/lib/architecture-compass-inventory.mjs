// Public ADR identities are shared by source validation and installed-payload checks.
export const PUBLIC_ARCHITECTURE_ADR_IDS = Object.freeze(
  Array.from({ length: 66 }, (_, index) => index + 1),
);
