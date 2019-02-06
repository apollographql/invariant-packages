import assert from "assert";
import defaultExport, { invariant, InvariantError } from "./invariant";

describe("ts-invariant", function () {
  it("should support both named and default exports", function () {
    assert.strictEqual(defaultExport, invariant);
  });

  it("should support very basic usage", function () {
    invariant(true, "ok");
    try {
      invariant(false, "expected");
      throw new Error("unexpected");
    } catch (e) {
      assert.strictEqual(e.message, "expected");
    }
  });

  it("should throw InvariantError instance", function () {
    try {
      invariant(false, "expected");
      throw new Error("unexpected");
    } catch (e) {
      assert.strictEqual(e.message, "expected");
      assert(e instanceof Error);
      assert(e instanceof InvariantError);
      assert.strictEqual(e.name, "Invariant Violation");
      assert.strictEqual(e.framesToPop, 1);
      assert.strictEqual(typeof e.stack, "string");
    }
  });
});
