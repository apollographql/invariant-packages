import recast from "recast";
const b = recast.types.builders;
const { createFilter } = require("rollup-pluginutils");

export default function invariantPlugin(options = {} as any) {
  const filter = createFilter(options.include, options.exclude);
  let nextErrorCode = 1;

  return {
    transform(code: string, id: string) {
      if (!filter(id)) {
        return;
      }

      const ast = recast.parse(code, { parser: this });

      recast.visit(ast, {
        visitCallExpression(path) {
          this.traverse(path);
          const node = path.value;

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
              isIdWithName(node.callee.property, "warn", "error")) {
            return b.logicalExpression("||", makeNodeEnvTest(), node);
          }
        },

        visitNewExpression(path) {
          this.traverse(path);
          const node = path.value;
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

function isIdWithName(node: any, ...names: string[]) {
  return node &&
    node.type === "Identifier" &&
    names.some(name => name === node.name);
}

function isCallWithLength(
  node: any,
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