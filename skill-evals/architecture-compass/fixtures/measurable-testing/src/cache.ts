export interface CacheIdentity {
  trust: string;
  inputs: string;
}
export function restoreTrustedCache(
  incoming: CacheIdentity,
  expected: CacheIdentity,
  restore: () => void,
): boolean {
  if (incoming.trust !== expected.trust || incoming.inputs !== expected.inputs) return false;
  restore();
  return true;
}
