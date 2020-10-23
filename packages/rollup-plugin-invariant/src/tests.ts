import assert from "assert";
import fs from "fs";
import plugin, { PluginOptions } from './plugin';
import * as recast from "recast";
import { parse } from "recast/parsers/acorn";
import invariant, { InvariantError } from "ts-invariant";

describe("rollup-plugin-invariant", function () {
  const CONDITION_AST = recast.parse(
    'process.env.NODE_ENV === "production"',
    { parser: { parse }},
  ).program.body[0].expression;

  assert.strictEqual(CONDITION_AST.type, "BinaryExpression");

  function check(
    id: string,
    options?: PluginOptions,
  ) {
    const path = require.resolve(id);
    const code = fs.readFileSync(path, "utf8");
    const ast = parse(code);
    const result = plugin(options).transform.call({
      parse(code: string) {
        return ast;
      },
    }, code, path);

    if (!result) {
      throw new InvariantError(`Transforming ${id} failed`);
    }

    let invariantCount = 0;

    recast.visit(parse(result.code), {
      visitCallExpression(path) {
        const node = path.node;
        if (node.callee.type === "Identifier" &&
            node.callee.name === "invariant") {

          const parent = path.parent.value;
          assert.strictEqual(parent.type, "ConditionalExpression");

          recast.types.astNodesAreEquivalent.assert(
            parent.test,
            CONDITION_AST,
          );

          if (parent.consequent === node) {
            if (options && options.errorCodes) {
              assert.strictEqual(node.arguments.length, 2);
              const arg2 = node.arguments[1];
              if (recast.types.namedTypes.Literal.check(arg2)) {
                assert.strictEqual(typeof arg2.value, "number");
              } else {
                assert.fail("unexpected argument: " + JSON.stringify(arg2));
              }
            } else {
              assert.strictEqual(node.arguments.length, 1);
            }
          }

          ++invariantCount;
        }

        this.traverse(path);
      }
    });

    invariant(invariantCount > 0);
    assert.notStrictEqual(invariantCount, 0);
  }

  it("should strip invariant error strings from react", function () {
    check("react/cjs/react.development.js");
    check("react/cjs/react.development.js", {
      errorCodes: true,
    });
  });

  it("should strip invariant error strings from react-dom", function () {
    this.timeout(10000); // Parsing takes a long time.
    check("react-dom/cjs/react-dom.development.js");
  });

  it("should strip invariant error strings from react-apollo", function () {
    check("react-apollo");
    check("react-apollo", {
      errorCodes: true,
    });
  });

  function checkTransform(
    input: string,
    output: string = input,
    options = {},
  ) {
    const ast = parse(input);
    const result = plugin(options).transform.call({
      parse(code: string) {
        return ast;
      }
    }, input, "fake/module/identifier");

    if (!result) {
      throw new InvariantError(`Transform failed: ${
        input
      }`);
    }

    assert.strictEqual(result.code, output);
  }

  it("leaves message-less invariant calls untouched", function () {
    checkTransform(`
      invariant(true);
    `);

    checkTransform(`
      invariant(false);
    `);

    checkTransform(`
      invariant(
        !first &&
        second &&
        third ||
        fourth
      );
    `);
  });

  it("should strip invariant.log(...) calls", function () {
    checkTransform(`
      if (!condition) {
        invariant.log("will", "be", "stripped");
      }
    `, `
      if (!condition) {
        process.env.NODE_ENV === "production" || invariant.log("will", "be", "stripped");
      }
    `);
  });

  it("should strip invariant.warn(...) calls", function () {
    checkTransform(`
      if (!condition) {
        invariant.warn("will", "be", "stripped");
      }
    `, `
      if (!condition) {
        process.env.NODE_ENV === "production" || invariant.warn("will", "be", "stripped");
      }
    `);
  });

  it("should strip invariant.error(...) calls", function () {
    checkTransform(`
      if (!condition) {
        invariant.error("will", "be", "stripped");
      }
    `, `
      if (!condition) {
        process.env.NODE_ENV === "production" || invariant.error("will", "be", "stripped");
      }
    `);
  });

  it("should import a process polyfill if requested", function () {
    checkTransform(`
      import { foo } from "bar";
      import def, { invariant, InvariantError } from "ts-invariant";
      invariant(true, "ok");
    `, `
      import { foo } from "bar";
      import def, { invariant, InvariantError, process } from "ts-invariant";
      process.env.NODE_ENV === "production" ? invariant(true) : invariant(true, "ok");
    `, {
      importProcessPolyfill: true,
    });

    checkTransform(`
      import { foo } from "bar";
      import def, { process, invariant } from "ts-invariant";
      invariant(true, "ok");
    `, `
      import { foo } from "bar";
      import def, { process, invariant } from "ts-invariant";
      process.env.NODE_ENV === "production" ? invariant(true) : invariant(true, "ok");
    `, {
      importProcessPolyfill: true,
    });

    checkTransform(`
      import { foo } from "bar";
      import invariant from "ts-invariant";
      invariant(true, "ok");
    `, `
      import { foo } from "bar";
      import invariant, { process } from "ts-invariant";
      process.env.NODE_ENV === "production" ? invariant(true) : invariant(true, "ok");
    `, {
      importProcessPolyfill: true,
    });

    checkTransform(`
      import invariant from "ts-invariant";
      import { InvariantError } from "ts-invariant";
    `, `
      import invariant, { process } from "ts-invariant";
      import { InvariantError } from "ts-invariant";
    `, {
      importProcessPolyfill: true,
    });

    checkTransform(`
      import { InvariantError } from "ts-invariant";
      import invariant from "ts-invariant";
    `, `
      import { InvariantError, process } from "ts-invariant";
      import invariant from "ts-invariant";
    `, {
      importProcessPolyfill: true,
    });

    checkTransform(`
      import { foo } from "bar";
      import invariant from "ts-invariant";
      invariant(true, "ok");
    `, `
      import { foo } from "bar";
      import invariant from "ts-invariant";
      process.env.NODE_ENV === "production" ? invariant(true) : invariant(true, "ok");
    `);
  });
});
