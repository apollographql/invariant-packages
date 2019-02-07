import assert from "assert";
import fs from "fs";
import plugin from "./plugin";
import recast from "recast";
import { parse } from "recast/parsers/acorn";
import invariant, { InvariantError } from "ts-invariant";

describe("rollup-plugin-invariant", function () {
  const CONDITION_AST = recast.parse(
    'process.env.NODE_ENV === "production"',
    { parser: { parse }},
  ).program.body[0].expression;

  assert.strictEqual(CONDITION_AST.type, "BinaryExpression");

  function check(id: string) {
    const path = require.resolve(id);
    const code = fs.readFileSync(path, "utf8");
    const ast = parse(code);
    const result = plugin().transform.call({
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
        const node = path.value;
        if (node.callee.type === "Identifier" &&
            node.callee.name === "invariant") {

          const parent = path.parent.value;
          assert.strictEqual(parent.type, "ConditionalExpression");

          recast.types.astNodesAreEquivalent.assert(
            parent.test,
            CONDITION_AST,
          );

          if (parent.consequent === node) {
            assert.strictEqual(node.arguments.length, 1);
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
  });

  it("should strip invariant error strings from react-dom", function () {
    this.timeout(10000); // Parsing takes a long time.
    check("react-dom/cjs/react-dom.development.js");
  });

  it("should strip invariant error strings from react-apollo", function () {
    check("react-apollo");
  });

  function checkTransform(input: string, output: string = input) {
    const ast = parse(input);
    const result = plugin().transform.call({
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
});
