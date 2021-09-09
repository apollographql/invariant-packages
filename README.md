# invariant-packages ![CI](https://github.com/apollographql/invariant-packages/workflows/CI/badge.svg)

Packages for working with `invariant(condition, message)` assertions.

### :warning: If you came here because of an Apollo Client error message like the following:
```
Invariant Violation: Invariant Violation: 27 (see https://github.com/apollographql/invariant-packages)
```
you should consult the file `node_modules/@apollo/client/invariantErrorCodes.js` for more details about the numbered invariant:
```
  27: {
    file: "@apollo/client/react/context/ApolloConsumer.js",

    node: invariant(context && context.client, 'Could not find "client" in the context of ApolloConsumer. ' +
        'Wrap the root component in an <ApolloProvider>.')
  },
```
The exact contents of the `invariantErrorCodes.js` file can change between `@apollo/client` releases, so make sure you're consulting the same version of `@apollo/client` that threw the error. Note also that the file is generated during the release process, and is not checked into the https://github.com/apollographql/apollo-client repository. This file was first included in `@apollo/client@3.1.0`.

## Usage

This repository is home to the [`ts-invariant`](packages/ts-invariant) and [`rollup-plugin-invariant`](archived/rollup-plugin-invariant) packages.

### Runtime usage (`ts-invariant`)

The `ts-invariant` package exports the following utilities:

#### `invariant(condition: any, message: string)`

Similar to the [the `invariant` function used by React](https://www.npmjs.com/package/invariant), this function throws an `InvariantError` with the given `message` if the `condition` argument evaluates to a falsy value.

#### `invariant.error(...args: any[])`

Equivalent to calling `console.error(...args)`.

#### `invariant.warn(...args: any[])`

Equivalent to calling `console.warn(...args)`.

#### `new InvariantError(message: string)`

The `Error` subclass thrown by failed `invariant` calls.

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

For example, if you see an error of the form
```
Invariant Violation: Invariant Violation: 38 (see https://github.com/apollographql/invariant-packages)
```
you should consult the file `node_modules/@apollo/client/invariantErrorCodes.js` for more details about the numbered invariant:
```
  38: {
    file: "@apollo/client/utilities/graphql/directives.js",
    node: invariant(evaledValue !== void 0, "Invalid variable referenced in @" + directive.name.value + " directive.")
  },
```
The dynamic value of `directive.name.value` will not be provided because those arguments are pruned in production (leaving just `invariant(evaledValue !== void)`), but this information should allow you to set a breakpoint in the `node_modules/@apollo/client/utilities/graphql/directives.js` file to investigate further.

The exact contents of the `invariantErrorCodes.js` file can change between `@apollo/client` releases, so make sure you're consulting the same version of `@apollo/client` that threw the error. Note also that the file is generated during the release process, and is not checked into the https://github.com/apollographql/apollo-client repository. This file was first included in `@apollo/client@3.1.0`.

#### Automatic `process` import

If you create an instance of the plugin with the `{ importProcessPolyfill: true }` option, any `import ... from "ts-invariant"` declarations will have `process` added to the list of imported identifiers.

When `ts-invariant` is used in a JS environment where `process` is globally defined, the `process` export will simply be the same as that global object. Otherwise, it will be an object of the shape `{ env: {} }`, to ensure `process.env.NODE_ENV` is safe to evaluate at runtime, in case it has not been replaced by the minifier.
