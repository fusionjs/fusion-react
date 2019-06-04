const {upgrade: upgradeDep} = require('yarn-utilities');
const {assertProjectDir} = require('../utils/assert-project-dir.js');
const {read, write, spawn} = require('../utils/node-helpers.js');
const {findLocalDependency} = require('../utils/find-local-dependency.js');
const {install} = require('./install.js');

async function upgrade({root, cwd, name, version}) {
  await assertProjectDir(cwd);

  const local = await findLocalDependency(root, name);
  if (local) {
    if (version && version !== local.meta.version) {
      throw new Error(`You must use version ${local.meta.version}`);
    }

    const meta = JSON.parse(await read(`${cwd}/package.json`, 'utf8'));
    if (meta.dependencies && meta.dependencies[name]) meta.dependencies[name] = local.meta.version;
    if (meta.devDependencies && meta.devDependencies[name]) meta.devDependencies[name] = local.meta.version;
    if (meta.peerDependencies && meta.peerDependencies[name]) meta.peerDependencies[name] = local.meta.version;
    if (meta.optionalDependencies && meta.optionalDependencies[name]) meta.optionalDependencies[name] = local.meta.version;
    await write(`${cwd}/package.json`, JSON.stringify(meta, null, 2), 'utf8');
  } else {
    await upgradeDep({roots: [cwd], dep: name, version});
  }
  await spawn('rm', ['-rf', 'node_modules'], {cwd});
  await install({root, cwd});
}

module.exports = {upgrade};