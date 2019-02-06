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
      throw new Error("should not have thrown");
    } catch (e) {
      assert.strictEqual(e.message, "expected");
      assert(e instanceof Error);
      assert(e instanceof InvariantError);
    }
  });
});
