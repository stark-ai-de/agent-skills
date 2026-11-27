import shared from "@servrox/code-quality/oxfmt";

export default {
  ...shared,
  // ADR-0080: preserve the established style during shared-policy adoption.
  trailingComma: "all",
  sortImports: false,
  proseWrap: "preserve",
};
