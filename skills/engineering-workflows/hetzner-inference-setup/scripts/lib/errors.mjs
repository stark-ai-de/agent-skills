export class SetupError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "SetupError";
    this.code = code;
    this.details = details;
  }
}

export function invariant(condition, code, message, details = undefined) {
  if (!condition) throw new SetupError(code, message, details);
}

export function asSetupError(error, fallbackCode = "unexpected_error") {
  if (error instanceof SetupError) return error;
  return new SetupError(fallbackCode, error instanceof Error ? error.message : String(error));
}
