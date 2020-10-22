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

export function invariant(condition: any, message?: string | number) {
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

export function setVerbosity(level: VerbosityLevel) {
  verbosityLevel = Math.max(0, verbosityLevels.indexOf(level));
}

// Code that uses ts-invariant with rollup-plugin-invariant may want to
// import this process stub to avoid errors evaluating process.env.NODE_ENV.
// However, because most ESM-to-CJS compilers will rewrite the process import
// as tsInvariant.process, which prevents proper replacement by minifiers, we
// also attempt to define the stub globally when it is not already defined.
let processStub: NodeJS.Process = { env: {} } as any;
export { processStub as process };
if (typeof process === "object") {
  processStub = process;
} else try {
  // Using Function to evaluate this assignment in global scope also escapes
  // the strict mode of the current module, thereby allowing the assignment.
  // Inspired by https://github.com/facebook/regenerator/pull/369.
  Function("stub", "process = stub")(processStub);
} catch (atLeastWeTried) {
  // The assignment can fail if a Content Security Policy heavy-handedly
  // forbids Function usage. In those environments, developers should take
  // extra care to replace process.env.NODE_ENV in their production builds,
  // or define an appropriate global.process polyfill.
}

export default invariant;
