export const REQUIRED_ARCHIVES = ["portable", "openai", "claude"];
const REQUIRED_PLATFORMS = ["linux", "darwin", "win32"];

export function archiveIdentityErrors(identities) {
  const errors = [];
  for (const os of REQUIRED_PLATFORMS) {
    if (identities.filter(({ report }) => report.os === os).length !== 1) {
      errors.push(`need exactly one ${os} archive identity report`);
    }
  }
  for (const { os, report } of identities) {
    if (!REQUIRED_PLATFORMS.includes(report.os) || report.archiveProfile !== "zip-store-v1") {
      errors.push(`${os}: unsupported platform or archive profile`);
    }
    for (const name of REQUIRED_ARCHIVES) {
      const entry = report.archives?.[name];
      if (
        !entry ||
        !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "") ||
        !Number.isSafeInteger(entry.bytes) ||
        entry.bytes <= 0
      ) {
        errors.push(`${os}: missing or invalid ${name} archive identity`);
      }
    }
  }
  const reference = identities[0];
  for (const current of identities.slice(1)) {
    for (const name of REQUIRED_ARCHIVES) {
      const expected = reference.report.archives?.[name];
      const actual = current.report.archives?.[name];
      if (expected?.sha256 !== actual?.sha256 || expected?.bytes !== actual?.bytes) {
        errors.push(
          `${name}: ${reference.os} ${expected?.sha256} != ${current.os} ${actual?.sha256}`,
        );
      }
    }
  }
  return errors;
}
