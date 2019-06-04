# Jazelle

Incremental, cacheable builds for large Javascript monorepos. Uses [Bazel](https://bazel.build)

---

- Getting started
  - [Why use Jazelle](#why-use-jazelle)
  - [Setup a monorepo](#setup-a-monorepo)
  - [Typical usage](#usage)

- Reference
  - [CLI](#cli)
  - [API](#api)
  - [Configuration](#configuration)
  - [Bazel rules](#bazel-rules)

- Misc
  - [Yarn equivalents](#yarn-equivalents)
  - [Bazel equivalents](#bazel-equivalents)
  - [Monorepo-wide static analysis](#monorepo-wide-static-analysis)
  - [Contributing](CONTRIBUTING.md)

---

## Why use Jazelle

Jazelle is designed for large organizations where different teams own different projects within a monorepo, and where projects depend on compiled assets from other projects in the monorepo. In terms of developer experience, it's meant to be a low-impact drop-in replacement for common day-to-day web stack commands such as `yarn add`, `yarn build` and `yarn test`.

Jazelle leverages Bazel for incremental/cacheable builds and should be able to integrate with Bazel rules from non-JS stacks. This is helpful if the rest of your organization is also adopting Bazel, especially if others in your organization are already investing into advanced Bazel features such as distributed caching. Jazelle can also be suitable if you develop libraries and want to test for regressions in downstream projects as part of your regular development workflow.

Due to its integration w/ Bazel, Jazelle can be a suitable solution if long CI times are a problem caused by running too many tests.

Jazelle can also be a suitable solution if the frequency of commits affecting a global lockfile impacts developer velocity.

If you just have a library of decoupled components, Jazelle might be overkill. In those cases, you could probably get away with using a simpler solution, such as Yarn workspaces, Lerna or Rush.

---

## Setup a monorepo

- [Scaffold a workspace](#scaffold-a-workspace)
- [Configure Bazel rules](#configure-bazel-rules)
- [Create manifest.json file](#create-manifestjson-file)
- [Setup .gitignore](#setup-gitignore)
- [What to commit to version control](#what-to-commit-to-version-control)

### Scaffold a workspace

```sh
mkdir my-monorepo
cd my-monorepo
jazelle init
```

The `jazelle init` command generates Bazel `WORKSPACE`, `BUILD.bazel` and `.bazelversion` files, along with the Jazelle configuration file `manifest.json`. If you are setting up Jazelle on an existing Bazel workspace, see [Bazel rules](#bazel-rules).

### Configure Bazel rules

Check that the `.bazelversion` file at the root of your repo contains your desired Bazel version. For example:

```
0.25.2
```

Check that the `WORKSPACE` file at the root of your repo is using the desired versions of Jazelle, Node and Yarn:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
  name = "jazelle",
  url = "https://registry.yarnpkg.com/jazelle/-/jazelle-[version].tgz",
  sha256 = "SHA 256 goes here",
)

load("@jazelle//:workspace-rules.bzl", "jazelle_dependencies")
jazelle_dependencies(
  node_version = "10.15.3",
  node_sha256 = {
    "mac": "7a5eaa1f69614375a695ccb62017248e5dcc15b0b8edffa7db5b52997cf992ba",
    "linux": "faddbe418064baf2226c2fcbd038c3ef4ae6f936eb952a1138c7ff8cfe862438",
    "windows": "93c881fdc0455a932dd5b506a7a03df27d9fe36155c1d3f351ebfa4e20bf1c0d",
  },
  yarn_version = "1.15.2",
  yarn_sha256 = "7f2f5a90bfe3890bc4653432118ba627cb71a9000a5f60f16efebfc760501396",
)
```

Jazelle SHA256 checksum can be computed through the following command:

```sh
curl -fLs https://registry.yarnpkg.com/jazelle/-/jazelle-[version].tgz | openssl sha256
```

Node SHA256 checksums can be found at `https://nodejs.org/dist/v[version]/SHASUM256.txt`. Use the checksums for these files:

- `node-v[version]-darwin-x64.tar.gz`
- `node-v[version]-linux-x64.tar.xz`
- `node-v[version]-win-x64.zip`

Yarn SHA256 checksum can be computed through the following command:

```sh
curl -fLs https://github.com/yarnpkg/yarn/releases/download/v[version]/yarn-[version].js | openssl sha256
```

Double check that the `BUILD.bazel` at the root of your repo contains this code:

```python
load("@jazelle//:build-rules.bzl", "jazelle")

jazelle(name = "jazelle", manifest = "manifest.json")
```

### Edit manifest.json file

Create a file called `manifest.json` at the root of the monorepo:

```json
{
  "projects": [
    "path/to/project-1",
    "path/to/project-2"
  ]
}
```

The `projects` field in this file should list every project that you want Jazelle to manage.

### Setup .gitignore

Add the following entry to .gitignore

```
third_party/jazelle/temp
```

### What to commit to version control

**DO** commit

- `manifest.json` file
- `WORKSPACE` file
- `BUILD.bazel` files
- `.bazelversion` file
- `.bazelignore` file
- `third_party/jazelle/BUILD.bazel` file
- `third_party/jazelle/scripts` folder
- projects' `yarn.lock` files

**DO NOT** commit

- `/third_party/jazelle/temp` folder
- `node_modules` folders

---

## Typical usage

- [CLI installation](#cli-installation)
  - [Upgrading](#upgrading)
- [Onboarding a project](#onboarding-a-project)
  - [Troubleshooting a failed onboarding](#troubleshooting-a-failed-onboarding)
- [Day-to-day usage](#day-to-day-usage)
- [Using Bazel](#using-bazel)
- [Getting out of bad states](#getting-out-of-bad-states)

### CLI installation

Install the CLI globally:

```sh
# install
yarn global add jazelle

# verify it's installed
jazelle version
```

#### Upgrading

```sh
yarn global upgrade jazelle
```

If upgrading fails, it's probably because you didn't follow the installation instructions. In that case, try reinstalling:

```sh
npm uninstall jazelle --global
yarn global remove jazelle
yarn global add jazelle
```

It's ok for users to have different versions of Jazelle installed. Jazelle runs all commands via Bazelisk, which enforces that the Bazel version specified in `.bazelversion` is used. Bazel, in turn, enforces that the Node and Yarn versions specified in `WORKSPACE` are used.

### Onboarding a project

- Copy and paste your project into the monorepo, at a desired path.
- Open `manifest.json` and add the path to your project.
- Ensure your project's package.json has `scripts` fields called `build`, `test`, `lint` and `flow`.
- Optionally, verify that your dependency versions match the dependency versions used by other projects in the monorepo. To verify, run `jazelle check`. To upgrade a dependency, run `jazelle upgrade [the-dependency] --version [desired-version]` from your project folder.
- Run `jazelle install` from your project folder to generate Bazel BUILD files, and install dependencies. This may take a few minutes the first time around since Bazel needs to install itself and its dependencies. Subsequent calls to `jazelle install` will be faster.
- Run `jazelle test` to verify that your project builds and tests pass. Optionally run `jazelle lint` and `jazelle flow`.

#### Troubleshooting a failed onboarding

If building your project fails, open the BUILD.bazel files and double check that the `dist` argument in the `web_library` call points to the folder where you expect compiled assets to be placed. This folder is often called `dist` or `bin`. Note that BUILD.bazel files may also be created in dependencies' folders, if they did not already have them. Use version control to identify where newly generated BUILD.bazel files were created and review their `dist` arguments.

### Day-to-day usage

Navigate to a project in the monorepo, then use [CLI commands](#cli), similar to how you would with `yarn`

```sh
# navigate to your project folder
cd path/to/project-1

# generates Bazel build files for relevant projects, if needed
jazelle install

# start project in dev mode
jazelle run

# run tests
jazelle test

# lint
jazelle lint

# type check
jazelle flow

# add dependency
jazelle add react
```

### Using Bazel

Jazelle provides three build rules: `web_library`, `web_binary` and `web_test`.

- `web_library` defines what source files and dependencies comprise a project. The `jazelle install` command automatically generates a `web_library()` declaration with the correct list of dependencies (by looking into the project's `package.json`)
- `web_binary` builds a project and runs a project that was built by a `web_library` action
- `web_test` runs a test script for a project built by a `web_library` action

If you add or remove an entry in your package.json that points to a local project, Jazelle updates the `yarn.lock` file and adds the dependency to the `deps` field of the `web_library` declation in your project's BUILD.bazel file. In Bazel, dependencies are declared using label syntax. A label consists of a `//` followed by the path to the project, followed by a `:` followed by the `name` field of the `web_library` declaration of the project.

For example, if you have a project in folder `path/to/my-project` whose `web_library` has `name = "hello"`, then its label is `//path/to/my-project:hello`.

```python
# an example BUILD.bazel file for a project with a dependency
web_library(
  name = "my-project",
  deps = [
    # depend on a project that lives under ./my-other-project
    "//my-other-project:my-other-project",
  ],
  srcs = glob(["**/*"]),
  dist = "dist",
)
```

### Getting out of bad states

While Jazelle attempts to always keep the workspace in a good state, it may be possible to get into a corrupt state, for example, if you manually edit system files (such as generated files in the `/third_party/jazelle/temp` folder).

Another way to get into a bad state is to change the name of a project. Currently, Jazelle does not support re-syncing depenency graphs after project name changes, since this use case is rare and the required checks would slow down CLI commands.

If you get into a bad state, here are some things you can try:

- Run `bazel clean --expunge` and run `jazelle install` from your project folder again
- Delete the `/third_party/jazelle/temp` folder and run `jazelle install`
- Undo changes to `[your-project]/BUILD.bazel` and run `jazelle install`
- Verify that `manifest.json` is valid JSON

---

## CLI

- [`jazelle --help`](#jazelle---help)
- [`jazelle version`](#jazelle-version)
- [`jazelle init`](#jazelle-init)
- [`jazelle install`](#jazelle-install)
- [`jazelle add`](#jazelle-add)
- [`jazelle remove`](#jazelle-remove)
- [`jazelle upgrade`](#jazelle-upgrade)
- [`jazelle greenkeep`](#jazelle-greenkeep)
- [`jazelle dedupe`](#jazelle-dedupe)
- [`jazelle purge`](#jazelle-purge)
- [`jazelle check`](#jazelle-check)
- [`jazelle chunk`](#jazelle-chunk)
- [`jazelle changed`](#jazelle-changed)
- [`jazelle build`](#jazelle-build)
- [`jazelle run`](#jazelle-run)
- [`jazelle test`](#jazelle-test)
- [Running NPM scripts](#running-npm-scripts)
- [Colorized errors](#colorized-errors)

### `jazelle --help`

Displays help information

### `jazelle version`

Displays installed version

### `jazelle init`

Scaffolds required workspace files

### `jazelle install`

- Downloads external dependencies and links local dependencies.
- Generates [Bazel](https://bazel.build/) BUILD files if they don't already exist for the relevant projects.
- Updates yarn.lock files if needed.

`jazelle install --cwd [cwd]`

- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

### `jazelle add`

Adds a dependency to the project's package.json, syncing the `yarn.lock` file, and the matching `web_library` rule in the relevant BUILD.bazel file if needed

`jazelle add --name [name] --version [version] --dev --cwd [cwd]`

- `--name` - Name of dependency to add
- `--version` - Version of dependency to add. Defaults to `npm info [name] version` for 3rd party packages, or the local version for local packages
- `--dev` - Whether to install as a devDependency. Default to `false`
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

### `jazelle remove`

Removes a dependency from the project's package.json, syncing the `yarn.lock` file, and the matching `web_library` rule in the relevant BUILD.bazel file if needed

`jazelle remove --name [name] --cwd [cwd]`

- `--name` - Name of dependency to remove
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

### `jazelle upgrade`

Upgrades a dependency in the project's package.json

`jazelle add [name] --version [version] --cwd [cwd]`

- `name` - Name of dependency to add
- `--version` - Version of dependency to upgrade. Defaults to `npm info [name] version` for 3rd party packages, or the local version for local packages
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

### `jazelle greenkeep`

Upgrades a dependency across all local projects that use it

`jazelle greenkeep [name] --version [version]`

- `name` - Name of dependency to add
- `--version` - Version of dependency to upgrade. Defaults to `npm info [name] version` for 3rd party packages, or the local version for local packages

### `jazelle dedupe`

Dedupe transitive dependencies in projects' yarn.lock files

`jazelle dedupe`

### `jazelle purge`

Removes generated files (i.e. `node_modules` folders and bazel output files)

`jazelle purge`

### `jazelle check`

Shows a report of out-of-sync top level dependencies across projects

`jazelle check`

```js
// sample report
{
  "valid": false,
  "policy": {
    "lockstep": false,
    "exceptions": [
      "my-dependency"
    ],
  },
  "reported": {
    "my-dependency": {
      "1.0.0": [
        "my-project-1",
        "my-project-2",
      ]
    }
  }
}
```

### `jazelle chunk`

Prints a glob pattern representing a chunk of files matching a given list of glob patterns. Useful for splitting tests across multiple CI jobs.

Glob patterns are matched via [minimatch](https://github.com/isaacs/minimatch)

`jazelle chunk --projects [projects] --jobs [jobs] --index [index]`

- `--patterns` - A pipe separated list of glob patterns. Patterns can be negated by prepending a `!` (e.g. `!tests/fixtures/*`)
- `--jobs` - Divide the files among this number of chunks
- `--index` - Which chunk. For example, if `patterns` find 10 files, jobs is `5` and index is `1`, then the third and fourth files will be returned as a `.*/file-3.js|.*/file-4.js` pattern.

For example, it's possible to parallelize Jest tests across multiple CI jobs via a script like this:

```sh
jest --testPathPattern=$(jazelle chunk --projects "tests/**/*|!tests/fixtures/**/*" --jobs $CI_JOB_COUNT --index $CI_JOB_INDEX)
```
### `jazelle changes`

Prints a list of Bazel test targets that have changed since the last git commit.

`jazelle changed`

Targets can be tested via the `bazel test [target]` command.

### `jazelle build`

Builds a Bazel target and its dependencies, caching if possible. Does not run the compiled artifact. See also [direct Bazel usage](#direct-bazel-usage)

`jazelle build --target [target] --cwd [cwd]`

- `--target` - A Bazel target name. Defaults to the shortname target name (e.g. if the label is `//foo:foo`, the target name is `foo`)
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

### `jazelle run`

Runs a Bazel target, building it and its dependencies if needed, caching if possible.

`jazelle run [target] --cwd [cwd]`

- `target` - A Bazel target name
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

If you want to run lint or flow checks within a Bazel sandbox and you want to see the output of the tool, you can run `jazelle run lint` and `jazelle run flow` respectively.

### `jazelle test`

Runs a Bazel target as a test, building it and its dependencies if needed, caching if possible. Running a target as a test caches it (whereas running w/ `jazelle run` does not). It also hides stdout/stderr output.

`jazelle test [target] --cwd [cwd]`

- `target` - A Bazel target name
- `--cwd` - Project folder (absolute or relative to shell `cwd`). Defaults to `process.cwd()`

If you want to run lint or flow checks and you only care whether the test passes, you can run `jazelle test lint` and `jazelle test flow` respectively.

### Running NPM scripts

You can run NPM scripts the same way as in Yarn. For example, if you have a script called `upload-files`, you can call it by running `jazelle upload-files`.

### Colorized errors

If you want commands to display colorized output, run their respective NPM scripts directly without going through Bazel (e.g. `jazelle lint` instead of  `jazelle run lint` or `jazelle test lint`). This will preserve stdout/stderr colors.

---

## API

`const {runCLI, install, add, remove, upgrade, dedupe, check, build, test, run} = require('jazelle')`

- [runCLI](#runcli)
- [version](#version)
- [scaffold](#scaffold)
- [install](#install)
- [add](#add)
- [remove](#remove)
- [upgrade](#upgrade)
- [greenkeep](#greenkeep)
- [dedupe](#dedupe)
- [purge](#purge)
- [check](#check)
- [chunk](#chunk)
- [changes](#changes)
- [build](#build)
- [test](#test)
- [run](#run)
- [getRootDir](#getRootDir)

### `runCLI`

Runs a CLI command given a list of arguments

`let runCLI: (args: Array<string>) => Promise<void>`

- `args` - An array of arguments, e.g. `['build', '--cwd', cwd]`

### `version`

The currently installed version. Note: this is a property, not a function.

`let version: string`

### `scaffold`

Generates Bazel files required to make Jazelle run in a workspace

`let version: ({cwd: string}) => Promise<void>`

- `cwd` - Project folder (absolute path)

### `install`

- Downloads external dependencies and links local dependencies.
- Generates [Bazel](https://bazel.build/) BUILD files if they don't exist for the relevant projects.
- Updates yarn.lock files if needed.

`let install: ({root: string, cwd: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `cwd` - Project folder (absolute path)

### `add`

Adds a dependency to the project's package.json, syncing the `yarn.lock` file, and the matching `web_library` rule in the relevant BUILD.bazel file if needed

`let add: ({root: string, cwd: string, name: string, version: string, dev: boolean}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `name` - Name of dependency to add
- `version ` - Version of dependency to add
- `dev` - Whether to install as a devDependency
- `cwd` - Project folder (absolute path)

### `remove`

Removes a dependency from the project's package.json, syncing the `yarn.lock` file, and the matching `web_library` rule in the relevant BUILD.bazel file if needed

`let remove: ({root: string, cwd: string, name: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `name` - Name of dependency to remove
- `cwd` - Project folder (absolute path)

### `upgrade`

Upgrades a dependency in the project's package.json

`let upgrade: ({root: string, cwd: string, name: string, version: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `name` - Name of dependency to upgrade
- `version ` - Version of dependency to add
- `cwd` - Project folder (absolute path)

### `greenkeep`

Upgrades a dependency across all local projects that use it

`let greenkeep: ({name: string, version: string}) => Promise<void>`

- `name` - Name of dependency to add
- `version` - Version of dependency to upgrade. Defaults to `npm info [name] version` for 3rd party packages, or the local version for local packages

### `dedupe`

Dedupe transitive dependencies in projects' yarn.lock files

`let dedupe: ({root: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)

### `purge`

Removes generated files (i.e. `node_modules` folders and bazel output files)

`let purge: ({root: string}) => Promise<void>`

### `check`

Returns a report of out-of-sync top level dependencies across projects

```js
// sample report
{
  "valid": false,
  "policy": {
    "lockstep": false,
    "exceptions": [
      "my-dependency"
    ],
  },
  "reported": {
    "my-dependency": {
      "1.0.0": [
        "my-project-1",
        "my-project-2",
      ]
    }
  }
}
```

```js
type Report = {
  valid: string,
  policy: {
    lockstep: boolean,
    exceptions: Array<string>
  },
  reported: {[string]: {[string]: Array<string>}},
}

let check: ({root: string}) => Promise<Report>
```

- `root` - Monorepo root folder (absolute path)

### `chunk`

Returns a glob pattern representing a chunk of files matching a given list of glob patterns. Useful for splitting tests across multiple CI jobs.

Glob patterns are matched via [minimatch](https://github.com/isaacs/minimatch)

`let chunk: ({root: string, patterns: Array<string>, jobs: number, index: number}) => Promise<string>`

- `root` - Monorepo root folder (absolute path)
- `patterns` - A list of glob patterns. Patterns can be negated by prepending a `!` (e.g. `!tests/fixtures/*`)
- `jobs` - Divide the files among this number of chunks
- `index` - Which chunk. For example, if `patterns` find 10 files, jobs is `5` and index is `1`, then the third and fourth files will be returned as a `.*/file-3.js|.*/file-4.js` pattern.

For example, it's possible to parallelize Jest tests across multiple CI jobs via a script like this:

```sh
jest --testPathPattern=$(node -e "console.log(require('jazelle').chunk({projects: ['tests/**/*', '!tests/fixtures/**/*'], jobs: $CI_JOB_COUNT, index: $CI_JOB_INDEX}))")
```

### `changes`

Returns a list of Bazel test targets that have changed since the last git commit.

`let changed: ({root: string}) => Promise<Array<string>>`

- `root` - Monorepo root folder (absolute path)

Targets can be tested via the `bazel test [target]` command.

### `build`

Builds a Bazel target (without running it), caching if possible

`let build: ({root: string, cwd: string, target: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `cwd` - Project folder (absolute path)
- `target` - Name of Bazel target (without path)

### `test`

Tests a Bazel target, building it if needed, caching if possible

`let test: ({root: string, cwd: string, target: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `cwd` - Project folder (absolute path)
- `target` - Name of Bazel target (without path)

### `run`

Runs a Bazel target, building it if needed, caching if possible

`let test: ({root: string, cwd: string, target: string}) => Promise<void>`

- `root` - Monorepo root folder (absolute path)
- `cwd` - Project folder (absolute path)
- `target` - Name of Bazel target (without path)

### `getRootDir`

Finds the absolute path of the monorepo root folder

`let getRootDir: ({dir: string}) => Promise<string>`

- `dir` - Any absolute path inside the monorepo

---

## Configuration

- [Projects](#projects)
- [Installation hooks](#installation-hooks)
- [Version policy](#version-policy)
- [Bazel build file template](#bazel-build-file-template)

Note: The `manifest.json` file does **not** allow comments; they are present here for informational purposes only.

```js
{
  // List of active projects in the monorepo
  "projects": [
    // paths to projects, relative to monorepo root
    "path/to/project-1",
    "path/to/project-2",
    // ...
  ],
  // Optional installation hooks
  "hooks": {
    "preinstall": "echo before",
    "postinstall": "echo after",
  },
  // Optional version policy
  "versionPolicy": {
    "lockstep": true,
    "exceptions": [
      "foo"
    ]
  }
}
```

### Projects

Projects paths must be listed in the `projects` field of the `manifest.json` file. Paths must be relative to the root of the monorepo.

```js
{
  "projects": [
    "path/to/project-1",
    "path/to/project-2",
  ],
}
```

### Installation hooks

Installation hooks run shell scripts before/after dependency installation.

```json
{
  "hooks": {
    "preinstall": "echo before",
    "postinstall": "echo after",
  }
}
```

### Version policy

The version policy structure specifies which direct dependencies must be kept in the same version in all projects that use them within the monorepo.

The version policy is enforced when running `jazelle install`, `jazelle add`, `jazelle remove` and `jazelle upgrade`.

If you change the version policy, it's your responsibility to run `jazelle check` to ensure that projects conform to the new policy, and to run `jazelle greenkeep` to fix version policy violations.

```json
{
  "versionPolicy": {
    "lockstep": true,
    "exceptions": [
      "foo"
    ]
  }
}
```

The `lockstep` field indicates whether ALL dependencies should be kept in the same version.

The `exceptions` field is a list of package names that should ignore the `lockstep` policy. For example, if `lockstep` is true and `exceptions` includes a package named `foo`, all dependency versions must be in lockstep, except `foo`. Conversely, if `lockstep` is false, and `exceptions` include a package `foo`, then all projects that use `foo` must use the same version of `foo`, but are free to use any version of any other package.

It's recommended that you set the policy to the following:

```json
{
  "versionPolicy": {
    "lockstep": true,
  }
}
```

You should avoid adding exceptions if using this policy.

Here's an alternative policy that may be more pragmatic for large existing codebases where only some packages are kept up-to-date by a platform team:

```json
{
  "versionPolicy": {
    "lockstep": false,
    "exceptions": [
      "foo",
      "bar"
    ]
  }
}
```

### Bazel build file template

The `third_party/jazelle/bazel-build-file-template.js` file should be a js file that exports a named export called `template`.

```js
module.exports.template = async ({name, path, label, dependencies}) => `# a BUILD.bazel template`
```

`let template: ({name: string, path: string, label: string, dependencies: Array<string>}) => Promise<string>`

- `name` - The shorthand name of the target. For example, if the path to the project is `path/to/foo`, `name` is `foo`
- `path` - The project's path, relative to the monorepo root
- `label` - The fully qualified Bazel label. For example `//path/to/foo:foo`
- `dependencies` - A list of labels for Bazel targets that are dependencies of the current rule

Here's an example of a custom build that changes the `dist` folder of library compilations and sets up a `flow` command for type checking:

```js
module.exports.template = async ({name, path, dependencies}) => `
package(default_visibility = ["//visibility:public"])

load("@jazelle//:build-rules.bzl", "web_library", "web_binary", "web_test", "flow_test")

web_library(
    name = "library",
    deps = [
        "//third_party/jazelle:node_modules",
        ${dependencies.map(d => `"${d}",`).join('\n        ')}
    ],
    srcs = glob(["**/*"]),
)

web_binary(
    name = "${name}",
    command = "dev",
    deps = [
        "//${path}:library",
    ],
    dist = ["dist"],
)

web_test(
    name = "test",
    command = "test",
    deps = [
        "//${path}:library",
    ],
)

web_test(
    name = "lint",
    command = "lint",
    deps = [
        "//${path}:library",
    ],
)

flow_test(
    name = "flow",
    deps = [
        "//${path}:library",
    ],
)`;
```

Note that BUILD.bazel files are not regenerated once they have been created. You can edit them after they've been created if you need to name certain targets differently in specific projects, or if you need to add custom Bazel rules or non-JS Bazel dependencies.

Jazelle edits web_library rules when `jazelle add` and `jazelle remove` commands are issued, in order to update the `deps` list. If you use different rules to build web projects, you must keep the BUILD.bazel file in sync with your package.json file yourself.

---

## Bazel rules

- [Importing rules](#importing-rules)
- [Workspace rules](#workspace-rules)
  - [`jazelle_dependencies`](#jazelle_dependencies-rule)
- [Build rules](#build-rules)
  - [`jazelle`](#jazelle-rule)
  - [`web_library`](#web_library-rule)
  - [`web_binary`](#web_binary-rule)
  - [`web_test`](#web_test-rule)

The easiest to setup Bazel in an empty repository is to run `jazelle init`. If you are setting up Jazelle on an existing Bazel workspace, you need to manually add Jazelle rules to the root WORKSPACE and BUILD.bazel files.

### Importing rules

Before Jazelle rules can be used in Bazel, you must first import them:

```python
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
http_archive(
  name = "jazelle",
  url = "https://registry.yarnpkg.com/jazelle/-/jazelle-[version].tgz",
  sha256 = "SHA 256 goes here",
)
```

Jazelle SHA256 checksum can be computed through the following command:

```sh
curl -fLs https://registry.yarnpkg.com/jazelle/-/jazelle-[version].tgz | openssl sha256
```

### Workspace rules

Rules that should be used from a monorepo's WORKSPACE file.

```python
load("@jazelle//:workspace-rules.bzl", "jazelle_dependencies")
```

#### `jazelle_dependencies` rule

Download and install binary dependencies (i.e. Node, Yarn) hermetically.

```python
jazelle_dependencies(
  node_version = string,
  node_sha256 = {
    "mac": string,
    "linux": string,
    "windows": string,
  },
  yarn_version = string,
  yarn_sha256 = string,
)
```

- `node_version` - The version of Node that should be installed
- `node_sha256` - The checksum of the architecture-specific distribution files of the chosen Node version
- `yarn_version` - The version of Yarn that should be installed
- `yarn_sha256` - The checksum of the chosen Yarn version

Jazelle SHA256 checksum can be computed through the following command:

```sh
curl -fLs https://github.com/lhorie/jazelle/releases/download/v[version]/jazelle-[version].tar.gz | openssl sha256
```

Node SHA256 checksums can be found at `https://nodejs.org/dist/v[version]/SHASUM256.txt`. Use the checksums for these files:

- `node-v[version]-darwin-x64.tar.gz`
- `node-v[version]-linux-x64.tar.xz`
- `node-v[version]-win-x64.zip`

Yarn SHA256 checksum can be computed through the following command:

```sh
curl -fLs https://github.com/yarnpkg/yarn/releases/download/v[version]/yarn-[version].js | openssl sha256
```

### Build rules

Rules that should be used from a project's BUILD.bazel file.

`load("@jazelle//:build-rules.bzl", "web_library", "web_binary", "web_test")`

### `jazelle` rule

Run the [Jazelle CLI](#cli) from Bazel. This rule should be added to the root of the monorepo. Note that all arguments must be passed after `--`

`bazel run //:jazelle -- version`

```python
jazelle(name = "jazelle", manifest = "manifest.json")
```

- `name` - Should be `jazelle`
- `manifest` - Should be `manifest.json`

#### `web_library` rule

Describes a set of files as a library

```python
web_library(
  deps = [string],
  srcs = [string],
)
```

- `deps` - A list of target labels that are dependencies of this rule
- `srcs` - A list of source code files for the project

This rule consumes transitive files from the `DefaultInfo(files)` provider of targets specified by `deps` and outputs them as transitive files via the `DefaultInfo(files)` provider.

#### `web_binary` rule

Builds a project via an npm script and optionally runs it. If this rule is run via `bazel build`, it generates a `output.tgz` file representing the project's compiled assets. If this rule is run via `bazel run`, it additionally extracts the output file and runs the project using the NPM script specified by `command`. The build step is cacheable, while the run step is not.

```python
web_binary(
  build = string,
  command = string,
  deps = [string],
  dist = string
)
```

- `build` - The npm script to build the project. Defaults to `build`
- `command` - The npm script to run the project. Defaults to `start`
- `deps` - A list of target labels that are dependencies of this rule
- `dist` - The name of the output folder where compiled assets are saved to

This rule consumes transitive files from the `DefaultInfo(files)` provider of targets specified by `deps`. If the transitive files include `output.tgz` files, they are extracted into the root folder of their respective project (in the Bazel sandbox).

#### `web_test` rule

Runs a npm script as a cacheable test (e.g. `yarn test`). Meant to be targeted via `bazel test`

```python
web_test(
  command = string,
  deps = [string],
)
```

- `command` - The npm script to execute
- `deps` - A list of target labels that are dependencies of this rule

This rule consumes transitive files from the `DefaultInfo(files)` provider of targets specified by `deps`. If the transitive files include `output.tgz` files, they are extracted into the root folder of their respective project (in the Bazel sandbox).

---

## Yarn equivalents

Jazelle commands are similar to yarn commands, but **not** exactly equivalent. Here's a table showing similar commands and their differences.

| Jazelle           | Yarn             | Key differences                                                              |
| ----------------- | ---------------- | ---------------------------------------------------------------------------- |
| `jazelle install` | `yarn install`   | The Jazelle command also sets up local dependencies                          |
| `jazelle build`   | `yarn run build` | The Jazelle command also builds (and caches) local dependencies              |
| `jazelle test`    | `yarn run test`  | The Jazelle command caches tests for projects whose code didn't change       |
| `jazelle add x`   | `yarn add x`     | The Jazelle command also manages deps declared in BUILD.bazel files          |

You should always use Jazelle commands instead of Yarn commands.

---

## Bazel equivalents

Jazelle allows using Bazel directly for building targets. Here's a table showing equivalent commands:

| Jazelle                   | Bazel                 |
| ------------------------- | --------------------- |
| `cd a && jazelle install` | N/A                   |
| `cd a && jazelle add x`   | N/A                   |
| `cd a && jazelle build`   | `bazel build //a:a`   |
| `cd a && jazelle build`   | `bazel build //a:a`   |
| `cd a && jazelle run dev` | `bazel run //a:dev`   |
| `cd a && jazelle test`    | `bazel test //a:test` |
| `cd a && jazelle lint`    | `bazel test //a:lint` |

You can use either Jazelle commands or Bazel commands interchangeably. This is helpful if your team is already invested into a Bazel-centric workflow.

It's recommended that you use Jazelle commands instead of Bazel, because Jazelle uses [Bazelisk](https://github.com/bazelbuild/bazelisk/) to enforce a Bazel version. You could also use Bazelisk itself.

## Monorepo-wide static analysis

If you are a monorepo maintainer and you need to implement static analysis logic that runs against files of every project in a monorepo, it's not feasible to depend on all projects at build time, since the build graph could conceivably require rebuilding every project in the monorepo. Instead, you can depend only on specific files.

The simplest way to do that is to add [`exports_files()`](https://docs.bazel.build/versions/master/be/functions.html#exports_files) or [`filegroup()`](https://docs.bazel.build/versions/master/be/general.html#filegroup) declarations in `buildFileTemplate` to expose the desired files. This way you can put your logic in a package that depends on files from several projects:

```python
# BUILD.bazel file in analyzable projects
exports_files([
  "//my-project:package.json", # expose the file we need for static analysis
])

# BUILD.bazel in static analysis project
js_binary(
  name = "check"
  command = "check",
  deps = [
    "//my-project:package.json",
    "//my-other-project:package.json",
    # ...
  ]
)
```

You can dynamically update the `deps` argument of the static analysis project BUILD.bazel file by writing a [`preinstall`](#installation-hooks) script that parses and edits the BUILD.bazel file. The list of monorepo projects is conveniently available in `manifest.json`.

Note that updating `buildFileTemplate` does not change existing BUILD.bazel files (since they could contain custom rules and modifications). If you want the same changes in existing files, you will have to edit those files yourself.

---

## TODOS

- support github references in dependencies
- watch library -> service
- hermetic install / refresh roots
- self upgrade