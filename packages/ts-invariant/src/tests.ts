import assert from "assert";
import reactInvariant from "invariant";

import { install, remove } from "../process/index.js";

import defaultExport, {
  ConsoleMethodName,
  invariant,
  InvariantError,
  setVerbosity,
} from "./invariant.js";

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

  function checkConsoleMethod(
    name: ConsoleMethodName,
    expectOutput: boolean,
  ) {
    const argsReceived: any[][] = [];
    const originalMethod = console[name];
    console[name] = (...args: any[]) => {
      argsReceived.push(args);
    };
    try {
      invariant[name]("named", "export");
      assert.deepEqual(argsReceived, expectOutput ? [
        ["named", "export"],
      ] : []);
      defaultExport[name]("default", "export");
      assert.deepEqual(argsReceived, expectOutput ? [
        ["named", "export"],
        ["default", "export"],
      ] : []);
    } finally {
      console[name] = originalMethod;
    }
  }

  it("invariant.debug", function () {
    checkConsoleMethod("debug", false);
  });

  it("invariant.log", function () {
    checkConsoleMethod("log", true);
  });

  it("invariant.warn", function () {
    checkConsoleMethod("warn", true);
  });

  it("invariant.error", function () {
    checkConsoleMethod("error", true);
  });

  it("setVerbosity", function () {
    checkConsoleMethod("debug", false);
    checkConsoleMethod("log", true);
    checkConsoleMethod("warn", true);
    checkConsoleMethod("error", true);

    assert.strictEqual(setVerbosity("warn"), "log");

    checkConsoleMethod("debug", false);
    checkConsoleMethod("log", false);
    checkConsoleMethod("warn", true);
    checkConsoleMethod("error", true);

    assert.strictEqual(setVerbosity("error"), "warn");

    checkConsoleMethod("debug", false);
    checkConsoleMethod("log", false);
    checkConsoleMethod("warn", false);
    checkConsoleMethod("error", true);

    assert.strictEqual(setVerbosity("debug"), "error");

    checkConsoleMethod("debug", true);
    checkConsoleMethod("log", true);
    checkConsoleMethod("warn", true);
    checkConsoleMethod("error", true);

    assert.strictEqual(setVerbosity("silent"), "debug");

    checkConsoleMethod("debug", false);
    checkConsoleMethod("log", false);
    checkConsoleMethod("warn", false);
    checkConsoleMethod("error", false);

    assert.strictEqual(setVerbosity("log"), "silent");

    checkConsoleMethod("debug", false);
    checkConsoleMethod("log", true);
    checkConsoleMethod("warn", true);
    checkConsoleMethod("error", true);
  });

  it("should let TypeScript know about the assertion made", function () {
    const value: { foo?: { bar?: string } } = {foo: {bar: "bar"}};
    invariant(value.foo, 'fail');

     // On compile time this should not raise "TS2532: Object is possibly 'undefined'."
    assert.strictEqual(value.foo.bar, "bar");
  });

  describe("ts-invariant/process", function () {
    it("install and remove", function () {
      const origDesc = Object.getOwnPropertyDescriptor(global, "process");
      Object.defineProperty(global, "process", {
        value: void 0,
        configurable: true,
      });
      assert.strictEqual(process, void 0);
      install();
      assert.deepStrictEqual(process, {
        env: {
          NODE_ENV: "production",
        },
      });
      remove();
      assert.strictEqual(typeof process, "undefined");
      if (origDesc) {
        Object.defineProperty(global, "process", origDesc);
      }
    });
  });
});
