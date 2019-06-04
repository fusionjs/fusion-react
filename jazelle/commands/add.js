const {resolve} = require('path');
const {assertProjectDir} = require('../utils/assert-project-dir.js');
const {add: addDep} = require('yarn-utilities');
const {getLocalDependencies} = require('../utils/get-local-dependencies.js');
const {node, yarn} = require('../utils/binary-paths.js');
const {exec, read, write} = require('../utils/node-helpers.js');
const {findLocalDependency} = require('../utils/find-local-dependency.js');
const {install} = require('./install.js');

/*
adding local dep should:
- add it to the project's package.json, pointing to the exact local version
- not add it to the project's yarn.lock
*/

async function add({root, cwd, name, version, dev}) {
  await assertProjectDir(cwd);

  const type = dev ? 'devDependencies': 'dependencies';
  const local = await findLocalDependency(root, name);
  if (local) {
    if (version && version !== local.version) {
      throw new Error(`You must use version ${local.version}`);
    }

    const meta = JSON.parse(await read(`${cwd}/package.json`, 'utf8'));
    if (!meta[type]) meta[type] = {};
    if (meta.dependencies && meta.dependencies[name]) meta.dependencies[name] = local.meta.version;
    if (meta.devDependencies && meta.devDependencies[name]) meta.devDependencies[name] = local.meta.version;
    if (meta.peerDependencies && meta.peerDependencies[name]) meta.peerDependencies[name] = local.meta.version;
    if (meta.optionalDependencies && meta.optionalDependencies[name]) meta.optionalDependencies[name] = local.meta.version;
    meta[type][name] = local.meta.version;
    await write(`${cwd}/package.json`, JSON.stringify(meta, null, 2), 'utf8');
  } else {
    // adding does not dedupe transitives, since consumers will rarely want to check if they introduced regressions in unrelated projects
    if (!version) version = JSON.parse(await exec(`${node} ${yarn} info ${name} version --json 2>/dev/null`)).data;
    await addDep({roots: [cwd], dep: name, version, type});
  }
  await install({root, cwd});
}

module.exports = {add};