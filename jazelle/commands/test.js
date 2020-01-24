// @flow
const {assertProjectDir} = require('../utils/assert-project-dir.js');
const {getPassThroughArgs} = require('../utils/parse-argv.js');
const {getManifest} = require('../utils/get-manifest.js');
const {getLocalDependencies} = require('../utils/get-local-dependencies.js');
const bazel = require('../utils/bazel-commands.js');
const yarn = require('../utils/yarn-commands.js');

/*::
import type {Stdio} from '../utils/node-helpers.js';
export type TestArgs = {
  root: string,
  cwd: string,
  args: Array<string>,
  stdio?: Stdio,
}
export type Test = (TestArgs) => Promise<void>
*/
const test /*: Test */ = async ({root, cwd, args, stdio = 'inherit'}) => {
  await assertProjectDir({dir: cwd});

  const params = getPassThroughArgs(args);
  const {projects, workspace} = await getManifest({root});
  if (workspace === 'sandbox') {
    await bazel.test({root, cwd, args: params, stdio});
  } else {
    const deps = await getLocalDependencies({
      dirs: projects.map(dir => `${root}/${dir}`),
      target: cwd,
    });
    await yarn.test({root, deps, args: params, stdio});
  }
};

module.exports = {test};
