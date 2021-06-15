const genericMessage = "Invariant Violation";
const {
  setPrototypeOf = function (obj: any, proto: any) {
    obj.__proto__ = proto;
    return obj;
  },
} = Object as any;

export class InvariantError extends Error {
  framesToPop = 1;
  name = genericMessage;
  constructor(message: string | number = genericMessage) {
    super(
      typeof message === "number"
        ? `${genericMessage}: ${message} (see https://github.com/apollographql/invariant-packages)`
        : message
    );
    setPrototypeOf(this, InvariantError.prototype);
  }
}

export function invariant(
  condition: any,
  message?: string | number,
): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

const verbosityLevels = ["log", "warn", "error", "silent"] as const;
type VerbosityLevel = (typeof verbosityLevels)[number];
type ConsoleMethodName = Exclude<VerbosityLevel, "silent">;
let verbosityLevel = verbosityLevels.indexOf("log");

function wrapConsoleMethod<M extends ConsoleMethodName>(method: M) {
  return function () {
    if (verbosityLevels.indexOf(method) >= verbosityLevel) {
      return console[method].apply(console, arguments as any);
    }
  } as (typeof console)[M];
}

export namespace invariant {
  export const log = wrapConsoleMethod("log");
  export const warn = wrapConsoleMethod("warn");
  export const error = wrapConsoleMethod("error");
}

export function setVerbosity(level: VerbosityLevel): VerbosityLevel {
  const old = verbosityLevels[verbosityLevel];
  verbosityLevel = Math.max(0, verbosityLevels.indexOf(level));
  return old;
}

export default invariant;
