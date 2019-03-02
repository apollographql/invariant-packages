# invariant-packages  [![CircleCI](https://circleci.com/gh/apollographql/invariant-packages/tree/master.svg?style=svg)](https://circleci.com/gh/apollographql/invariant-packages/tree/master)

Packages for working with `invariant(condition, message)` assertions.

## Usage

This repository is home to the [`ts-invariant`](packages/ts-invariant) and [`rollup-plugin-invariant`](packages/rollup-plugin-invariant) packages.

### Runtime usage (`ts-invariant`)

The `ts-invariant` package exports the following utilities:

#### `invariant(condition, message: string)`

Similar to the [the `invariant` function used by React](https://www.npmjs.com/package/invariant), this function throws an `InvariantError` with the given `message` if the `condition` argument evaluates to a falsy value.

#### `invariant.error(...args: any[])`

Equivalent to calling `console.error(...args)`.

#### `invariant.warn(...args: any[])`

Equivalent to calling `console.warn(...args)`.

#### `new InvariantError(message: string)`

The `Error` subclass thrown by failed `invariant` calls.

This class is especially useful when writing TypeScript, because
```ts
invariant(typeof value === "number", "not a number");
console.log(value * 2); // type error!
```
doesn't tell TypeScript anything useful about `value`, whereas the following code can take full advantage of TypeScript's conditional type narrowing functionality:
```ts
if (typeof value !== "number") {
  throw InvariantError("not a number");
}
// TypeScript understands that value must be a number here:
console.log(value * 2);
```

### Build-time usage (`rollup-plugin-invariant`)

If you're using [Rollup](https://rollupjs.org) to bundle your code, or using a library that was bundled using Rollup and `rollup-plugin-invariant`, then the above utilities will be transformed so that minifiers can strip the long error strings from your production bundle.

Calls of the form `invariant(condition, message)` are transformed to
```ts
process.env.NODE_ENV === 'production'
  ? invariant(condition)
  : invariant(condition, message)
```

Expressions of the form `new InvariantError(message)` are transformed to
```ts
process.env.NODE_ENV === 'production'
  ? new InvariantError()
  : new InvariantError(message)
```

Although this looks like more code, it enables minifiers to prune the unreached branch of the conditional expression based on the value of `process.env.NODE_ENV`, so only the shorter version remains in production.

#### Configuration

Here's how you might configure Rollup to use `rollup-plugin-invariant` and also minify the transformed code effectively:

```js
// rollup.config.js

import invariantPlugin from "rollup-plugin-invariant";
import { terser as minify } from "rollup-plugin-terser";

export default [{
  input: "src/index.js",
  output: {
    file: "lib/bundle.js",
    format: "cjs"
  },
  plugins: [
    invariantPlugin({
      errorCodes: true,
    }),
  ],
}, {
  input: "lib/bundle.js",
  output: {
    file: "lib/bundle.min.js",
    format: "cjs"
  },
  plugins: [
    minify({
      compress: {
        global_defs: {
          "@process.env.NODE_ENV": JSON.stringify("production"),
        },
      },
    }),
  ],
}];
```

#### Error codes

If you create an instance of the plugin with the `{ errorCodes: true }` option, message strings will be replaced with numeric error codes instead of simply disappearing, so `invariant(condition, message)` becomes
```ts
process.env.NODE_ENV === 'production'
  ? invariant(condition, <error code>)
  : invariant(condition, message)
```
and `new InvariantError(message)` becomes
```ts
process.env.NODE_ENV === 'production'
  ? new InvariantError(<error code>)
  : new InvariantError(message)
```

With `errorCodes` enabled, `InvariantError` messages will be displayed as
```
Invariant Violation: <error code> (see https://github.com/apollographql/invariant-packages)
```

Since the full development version of the error is colocated with the production one in code that has been transformed by `rollup-plugin-invariant`, it should be relatively easy to determine the nature of the error by looking for the given error code in the unminified bundle.
