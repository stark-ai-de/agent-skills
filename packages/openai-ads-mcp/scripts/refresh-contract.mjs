import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import snapshot from "../references/advertiser-contract.json" with { type: "json" };

// The checked-in snapshot owns the reviewed allowlist. An upstream document
// cannot add operations or change their public names, paths, or methods.
const selectedOperations = snapshot.operations.map(({ name, method, path }) => ({
  name,
  method,
  path,
}));
const omittedAnnotations = new Set(["title", "description", "example", "examples", "externalDocs"]);
const schemaMaps = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
  "dependentSchemas",
]);
const schemaValues = new Set([
  "additionalProperties",
  "unevaluatedProperties",
  "propertyNames",
  "contains",
  "not",
  "if",
  "then",
  "else",
  "items",
  "additionalItems",
  "unevaluatedItems",
  "contentSchema",
  "allOf",
  "anyOf",
  "oneOf",
  "prefixItems",
]);

export function projectSchema(schema, onReference = () => {}) {
  if (Array.isArray(schema)) return schema.map((item) => projectSchema(item, onReference));
  if (schema === null || typeof schema !== "object") return schema;
  if (typeof schema.$ref === "string") onReference(schema.$ref);
  return Object.fromEntries(
    Object.entries(schema).flatMap(([key, value]) => {
      if (omittedAnnotations.has(key) || key.startsWith("x-")) return [];
      // Keys in these maps are API field names, never schema annotations.
      if (schemaMaps.has(key))
        return [
          [
            key,
            Object.fromEntries(
              Object.entries(value).map(([name, child]) => [
                name,
                projectSchema(child, onReference),
              ]),
            ),
          ],
        ];
      if (key === "dependencies")
        return [
          [
            key,
            Object.fromEntries(
              Object.entries(value).map(([name, child]) => [
                name,
                Array.isArray(child) ? structuredClone(child) : projectSchema(child, onReference),
              ]),
            ),
          ],
        ];
      if (schemaValues.has(key)) return [[key, projectSchema(value, onReference)]];
      // Keep literal data in defaults, enums, and constants intact as well.
      return [[key, structuredClone(value)]];
    }),
  );
}

export function projectContract(rawSource, retrieved) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved))
    throw new Error("Provide the reviewed source retrieval date as YYYY-MM-DD.");
  const upstream = JSON.parse(rawSource.toString());
  const referenced = new Set();
  const project = (schema) =>
    projectSchema(schema, (ref) => {
      if (!/^#\/components\/schemas\/[^/]+$/.test(ref))
        throw new Error(`Unsupported request schema reference: ${ref}`);
      referenced.add(
        ref.slice("#/components/schemas/".length).replaceAll("~1", "/").replaceAll("~0", "~"),
      );
    });
  const operations = selectedOperations.map(({ name, method, path }) => {
    const route = upstream.paths?.[path];
    const operation = route?.[method.toLowerCase()];
    if (!operation) throw new Error(`The reviewed operation is absent upstream: ${method} ${path}`);
    const parameters = new Map();
    for (const parameter of [...(route.parameters ?? []), ...(operation.parameters ?? [])]) {
      if (parameter.$ref || !parameter.schema)
        throw new Error(`Unsupported parameter for ${method} ${path}`);
      const { name: parameterName, in: location, required, schema } = parameter;
      parameters.set(`${location}:${parameterName}`, {
        name: parameterName,
        in: location,
        ...(required !== undefined ? { required } : {}),
        schema: project(schema),
      });
    }
    const body = operation.requestBody?.content?.["application/json"]?.schema;
    if (operation.requestBody && !body)
      throw new Error(`Unsupported request body for ${method} ${path}`);
    return {
      name,
      method,
      path,
      parameters: [...parameters.values()],
      ...(body ? { body: project(body) } : {}),
    };
  });
  const schemas = {};
  // Iterating the Set also visits references added by each transitive schema.
  for (const name of referenced) {
    const schema = upstream.components?.schemas?.[name];
    if (schema === undefined) throw new Error(`Missing request schema: ${name}`);
    Object.defineProperty(schemas, name, { value: project(schema), enumerable: true });
  }
  return {
    source: snapshot.source,
    retrieved,
    sourceSha256: createHash("sha256").update(rawSource).digest("hex"),
    operations,
    schemas: Object.fromEntries(
      Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b, "en")),
    ),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sourcePath, outputPath, retrieved, ...extra] = process.argv.slice(2);
  if (!sourcePath || !outputPath || !retrieved || extra.length)
    throw new Error(
      "Usage: node refresh-contract.mjs INPUT_OPENAPI_JSON OUTPUT_SNAPSHOT_JSON YYYY-MM-DD",
    );
  const projected = projectContract(await readFile(sourcePath), retrieved);
  await writeFile(outputPath, `${JSON.stringify(projected, null, 2)}\n`);
}
