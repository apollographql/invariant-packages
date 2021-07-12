import * as recast from "recast";
const b = recast.types.builders;
const { createFilter } = require("rollup-pluginutils");

export interface PluginOptions {
  errorCodes?: boolean;
  importProcessPolyfill?: boolean;
  include?: Array<string | RegExp> | string | RegExp | null,
  exclude?: Array<string | RegExp> | string | RegExp | null,
}

export default function invariantPlugin(options: PluginOptions = {}) {
  const filter = createFilter(options.include, options.exclude);
  let nextErrorCode = 1;

  return {
    name: "rollup-plugin-invariant",
    transform(code: string, id: string) {
      if (!filter(id)) {
        return;
      }

      const ast = recast.parse(code, { parser: this });
      let needToImportProcess = !!options.importProcessPolyfill;

      recast.visit(ast, {
        visitImportDeclaration(path) {
          this.traverse(path);
          const node = path.node;
          if (
            needToImportProcess &&
            node.source.value === "ts-invariant" &&
            node.specifiers &&
            !node.specifiers.some((spec: any) => {
              return isIdWithName(spec.imported, "process");
            })
          ) {
            needToImportProcess = false;
            path.get("specifiers").push(
              b.importSpecifier(b.identifier("process")),
            );
          }
        },

        visitCallExpression(path) {
          this.traverse(path);
          const node = path.node;

          if (isCallWithLength(node, "invariant", 1)) {
            const newArgs = node.arguments.slice(0, 1);
            if (options.errorCodes) {
              newArgs.push(b.numericLiteral(nextErrorCode++));
            }

            return b.conditionalExpression(
              makeNodeEnvTest(),
              b.callExpression.from({
                ...node,
                arguments: newArgs,
              }),
              node,
            );
          }

          if (node.callee.type === "MemberExpression" &&
              isIdWithName(node.callee.object, "invariant") &&
              isIdWithName(node.callee.property, "debug", "log", "warn", "error")) {
            return b.logicalExpression("||", makeNodeEnvTest(), node);
          }
        },

        visitNewExpression(path) {
          this.traverse(path);
          const node = path.node;
          if (isCallWithLength(node, "InvariantError", 0)) {
            const newArgs = [];
            if (options.errorCodes) {
              newArgs.push(b.numericLiteral(nextErrorCode++));
            }

            return b.conditionalExpression(
              makeNodeEnvTest(),
              b.newExpression.from({
                ...node,
                arguments: newArgs,
              }),
              node,
            );
          }
        }
      });

      return {
        code: recast.print(ast).code,
        map: null,
      };
    }
  };
}

type CallExpression = recast.types.namedTypes.CallExpression;
type NewExpression = recast.types.namedTypes.NewExpression;

function isIdWithName(node: any, ...names: string[]) {
  return recast.types.namedTypes.Identifier.check(node) &&
    names.some(name => name === node.name);
}

function isCallWithLength(
  node: CallExpression | NewExpression,
  name: string,
  length: number,
) {
  return isIdWithName(node.callee, name) &&
    node.arguments.length > length;
}

function makeNodeEnvTest() {
  return b.binaryExpression(
    "===",
    b.memberExpression(
      b.memberExpression(
        b.identifier("process"),
        b.identifier("env")
      ),
      b.identifier("NODE_ENV"),
    ),
    b.stringLiteral("production"),
  );
}
