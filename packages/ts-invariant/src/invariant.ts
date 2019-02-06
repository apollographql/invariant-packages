const genericMessage = "Invariant Violation";
const {
  setPrototypeOf = function (obj: any, proto: any) {
    obj.__proto__ = proto;
    return obj;
  },
} = Object;

export class InvariantError extends Error {
  framesToPop = 1;
  name = genericMessage;
  constructor(message: string = genericMessage) {
    super(message);
    setPrototypeOf(this, InvariantError.prototype);
  }
}

export function invariant(condition: any, message: string) {
  if (!condition) {
    throw new InvariantError(message);
  }
}

export default invariant;
