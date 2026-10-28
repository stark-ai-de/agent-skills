// Maintenance-time entrypoint only; consumers import the bundled artifact.
// SPDX-License-Identifier: Apache-2.0
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
export { renderMermaidSVG } from "beautiful-mermaid";
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);
export const parseMarkdownTree = (value) => parser.parse(value);
