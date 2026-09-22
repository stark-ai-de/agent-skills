import fs from "node:fs";

// Never include key material or user-specific file paths in diagnostics.
export function credential(env = process.env) {
  const source =
    env.TYPESAFE_API_KEY !== undefined ? "environment" : env.TYPESAFE_API_KEY_FILE ? "file" : null;
  let key = env.TYPESAFE_API_KEY;
  if (source === "file") {
    let fd;
    try {
      fd = fs.openSync(
        env.TYPESAFE_API_KEY_FILE,
        fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0),
      );
      if (!fs.fstatSync(fd).isFile()) return { source, reason: "credential-file-not-regular" };
      const bytes = Buffer.alloc(4097);
      const size = fs.readSync(fd, bytes, 0, bytes.length, 0);
      if (size > 4096) return { source, reason: "credential-file-too-large" };
      key = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size));
    } catch {
      return { source, reason: "credential-file-unreadable" };
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }
  if (typeof key !== "string" || !key.trim()) return { source, reason: "credential-missing" };
  key = key.trim();
  if (Buffer.byteLength(key) > 4096 || /\s/.test(key))
    return { source, reason: "credential-invalid" };
  return { source, key };
}
