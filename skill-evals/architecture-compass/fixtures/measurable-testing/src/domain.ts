export interface RecordValue {
  name: string;
  version: number;
}
export function parseRecord(value: unknown): RecordValue {
  if (
    !value ||
    typeof value !== "object" ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    !("version" in value) ||
    typeof value.version !== "number" ||
    !Number.isSafeInteger(value.version) ||
    value.version < 1
  )
    throw new Error("record requires a nonempty name and positive integer version");
  return { name: value.name, version: value.version };
}
