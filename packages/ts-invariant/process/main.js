'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function maybe(thunk) {
  try { return thunk() } catch (_) {}
}

let needToRemove = false;

function install() {
  if (!maybe(() => process.env.NODE_ENV) &&
      !maybe(() => process)) {
    Object.defineProperty(global, "process", {
      value: {
        env: {
          // This default needs to be "production" instead of "development", to
          // avoid the problem https://github.com/graphql/graphql-js/pull/2894
          // will eventually solve, once merged and released.
          NODE_ENV: "production",
        },
      },
      // Let anyone else change global.process as they see fit, but hide it from
      // Object.keys(global) enumeration.
      configurable: true,
      enumerable: false,
      writable: true,
    });
    needToRemove = true;
  }
}

// Call install() at least once, when this module is imported.
install();

function remove() {
  if (needToRemove) {
    delete global.process;
    needToRemove = false;
  }
}

exports.install = install;
exports.remove = remove;
//# sourceMappingURL=main.js.map
