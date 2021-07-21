# fusion-cli

[![Build status](https://badge.buildkite.com/7a82192275779f6a8ba81f7d4a1b0d294256838faa1dfdf080.svg?branch=master)](https://buildkite.com/uberopensource/fusionjs)

The CLI interface for Fusion.js

The `fusion-cli` package is responsible for orchestrating compile-time configuration for server and browser bundles, as well as development, test and production variations. It provides a standardized Babel configuration that includes async/await support as well as stage 3+ Ecmascript features.

Due to the complexity involved in configuring many permutations of configurations, Fusion.js does not support custom `webpack.config`. This design decision allows Fusion.js to eventually move away from Webpack if faster and better bundlers become available. Additionally, it allows Fusion.js to make changes to the internal webpack configuration without the concern of breaking users customizations. If you run into a situation where you feel you need to make a webpack customization, please reach out to us on [slack](https://join.slack.com/t/fusionjs/shared_invite/enQtMzk3NjM0MTg0MTI4LWJhNzVjYjk5ZDVlYWIxZWViMjA3YzE5OTc4YWZkNzBkZmNkYmJkMDYyOGEzODEwMzRmMWExMzc1NDIzMmY2NDQ) or create an issue describing your use case.

The CLI is also responsible for hot module reloading in development mode, and for running the web server.

### Installation

```sh
yarn add fusion-cli
```

---

### CLI API

The CLI API can be most easily run through the Yarn or NPX CLI, e.g. `yarn fusion build` or `npx fusion build`.

- `fusion build [dir] [--production] [--log-level] [--maxWorkers]`
  Builds your application assets

  This command generates transpiled javascript/source map files (aka assets, artifacts) for browser and server. By default it builds development assets, but can also build test and production assets, given the respective flags.

  Build artifacts are stored in the `.fusion` directory.

  - `--production`: Build production assets
  - `--log-level`: Log level to output to console `[default: "info"]`
  - `--skipSourceMaps`: Skip building source maps
  - `--maxWorkers`: Maximum number of workers create by webpack during build process

  Builds where the ENABLE_REACT_PROFILER environment variable is set to `'true'` will enable the [Fusion React Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) in apps deployed to production. (NOTE: using the react profiler will itself slightly degrade performance):

  - `ENABLE_REACT_PROFILER=true fusion build`

- `fusion dev [dir] [--port] [--no-hmr] [--test] [--log-level] [--forceLegacyBuild] [--disablePrompts]`
  Builds development assets and runs the application in development mode

  Note that this command only builds browser artifacts in memory, and it doesn't save them to the filesystem. This allows hot module reloading to occur faster since there's no performance cost due to I/O access.

  - `--port`: The port on which the application runs `[default: 3000]`
  - `--no-hmr`: Run without hot modules replacement
  - `--test`: Run tests as well as application
  - `--log-level`: Log level to output to console `[default: "info"]`
  - `--forceLegacyBuild`: Force enable legacy build. By default not compiled in dev.
  - `--exitOnError`: Exit the process if a compiliation error occurs.
  - `--preserveNames`: Disable name mangling during script minification
  - `--disablePrompts`: Disable command-line prompts. Useful for CI environment

<!--
* `fusion profile [--environment] [--watch] [--file-count]`: Profile your application
  * `--environment`: Either `production` or `development` `[default: "production"]`
  * `--watch`: After profiling, launch source-map-explorer with file watch
  * `--file-count`: The number of file sizes to output, sorted largest to smallest (-1 for all files) `[default: 20]`
-->

- `fusion start [--environment]`
  Runs your application, assuming you have previously built them via `fusion build`. Note that build artifacts must be saved to disk (i.e. this command will fail if you use `fusion dev` to build artifacts instead of `fusion build`.

  - `--environment`: Which environment/assets to run - defaults to first available assets among `["development", "production"]`

- `fusion test [options]`
  Builds test assets and runs tests

  Tests are run with Jest

  - `--dir`: Root path for the application relative to CLI CWD. (default .)
  - `--debug`: Debug tests using --inspect-brk and --runInBand. (default false)
  - `--match`: Runs test files that match a given string
  - `--env`: Comma-separated list of environments to run tests in. Defaults to running both node and browser tests. (default jsdom,node)
  - `--testFolder`: Which folder to look for tests in. Deprecated, use testMatch or testRegex instead.
  - `--testMatch`: Which folder to look for tests in. A comma-separated list of glob patterns.
  - `--testRegex`: Which folder to look for tests in. A comma-separated list of regexp strings.
  - `--configPath`: Path to the jest configuration, used for testing. (default [path-to-fusion-cli]/build/jest/jest-config.js)
  - `--updateSnapshot`, `-u`: Updates snapshots

  Jest pass-through options

  - `--collectCoverageFrom`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#collectcoveragefrom
  - `--changedFilesWithAncestor`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#changedfileswithancestor
  - `--changedSince`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#changedsince
  - `--ci`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#ci
  - `--clearCache`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#clearcache
  - `--colors`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#colors
  - `--coverage`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#coverage
  - `--collectCoverage`: Jest CLI argument. Alias for `--coverage` See: https://jestjs.io/docs/en/cli.html#coverage
  - `--detectOpenHandles`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#detectopenhandles
  - `--errorOnDeprecated`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#errorondeprecated
  - `--expand`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#expand
  - `--findRelatedTests`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#findrelatedtests
  - `--json`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#json
  - `--lastCommit`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#lastcommit
  - `--listTests`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#listtests
  - `--logHeapUsage`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#logheapusage
  - `--noStackTrace`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#nostacktrace
  - `--noVerbose`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#verbose
  - `--notify`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#notify
  - `--onlyChanged`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#onlychanged
  - `--outputPath`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#outputpath
  - `--passWithNoTests`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#passwithnotests
  - `--reporters`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#reporters
  - `--showConfig`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#showconfig
  - `--silent`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#silent
  - `--testLocationInResults`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#testlocationinresults
  - `--useStderr`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#usestderr
  - `--version`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#version
  - `--watch`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#watch
  - `--watchAll`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#watchall
  - `--watchman`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#watchman
  - `--maxWorkers`: Jest CLI argument. See: https://jestjs.io/docs/en/cli.html#maxworkers

- `fusion profile`
  Generates a graph diagram of dependencies

### Webpack stats.json file

Building an app generates a `.fusion/stats.json` file, which can be used with [`webpack-bundle-analyzer`](https://www.npmjs.com/package/webpack-bundle-analyzer)
