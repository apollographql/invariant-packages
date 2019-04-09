import assert from "assert";
import defaultExport, { invariant, InvariantError, process } from "./invariant";
import reactInvariant from "invariant";

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
      assert.strictEqual(String(e), "Invariant Violation: expected");
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

  it("should behave like the React invariant function", function () {
    let reactError;
    try {
      reactInvariant(false, "oyez");
    } catch (e) {
      reactError = e;
    }
    let ourError;
    try {
      invariant(false, "oyez");
    } catch (e) {
      ourError = e;
    }
    assert.strictEqual(reactError.message, "oyez");
    assert.strictEqual(ourError.message, "oyez");
    assert.deepEqual(reactError, ourError);
    assert.deepEqual(Object.keys(ourError).sort(), [
      "framesToPop",
      "name",
    ]);
  });

  it("should annotate numeric error codes with URL", function () {
    try {
      invariant(false, 123);
      throw new Error("unexpected");
    } catch (e) {
      assert(e instanceof InvariantError);
      assert.strictEqual(
        e.message,
        "Invariant Violation: 123 (see https://github.com/apollographql/invariant-packages)",
      );
    }

    const error = new InvariantError(456);
    assert.strictEqual(
      error.message,
      "Invariant Violation: 456 (see https://github.com/apollographql/invariant-packages)",
    );
  });

  it("invariant.warn", function () {
    const argsReceived: any[][] = [];
    const { warn } = console;
    console.warn = (...args) => {
      argsReceived.push(args);
    };
    try {
      invariant.warn("named", "export");
      assert.deepEqual(argsReceived, [
        ["named", "export"],
      ]);
      defaultExport.warn("default", "export");
      assert.deepEqual(argsReceived, [
        ["named", "export"],
        ["default", "export"],
      ]);
    } finally {
      console.warn = warn;
    }
  });

  it("invariant.error", function () {
    const argsReceived: any[][] = [];
    const { error } = console;
    console.error = (...args) => {
      argsReceived.push(args);
    };
    try {
      invariant.error("named", "export");
      assert.deepEqual(argsReceived, [
        ["named", "export"],
      ]);
      defaultExport.error("default", "export");
      assert.deepEqual(argsReceived, [
        ["named", "export"],
        ["default", "export"],
      ]);
    } finally {
      console.error = error;
    }
  });

  it("should provide a usable process.env stub", function () {
    assert.strictEqual(typeof process, "object");
    assert.strictEqual(typeof process.env, "object");
    if (process.versions) {
      assert.strictEqual(typeof process.versions.node, "string");
    }
  });
});
