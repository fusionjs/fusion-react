// @flow
const {satisfies, minVersion, compare, gt} = require('semver');
const {parse, stringify} = require('@yarnpkg/lockfile');
const {read, exec, write} = require('./node-helpers.js');
const {node, yarn} = require('./binary-paths.js');
const {isYarnResolution} = require('./is-yarn-resolution.js');

/*::
export type Report = {
  [string]: {
    [string]: Array<string>
  }
};
export type CheckArgs = {
  roots: Array<string>,
};
export type Check = (CheckArgs) => Promise<Report>;
*/
const check /*: Check */ = async ({roots}) => {
  const versions = {};
  function collectVersions(meta, type) {
    Object.keys(meta[type] || {}).forEach(name => {
      const version = meta[type][name];
      if (!versions[name]) versions[name] = {};
      if (!versions[name][version]) versions[name][version] = [];
      versions[name][version].push(meta.name);
      versions[name][version].sort();
    });
  }

  await Promise.all(
    roots.map(async dir => {
      const meta = JSON.parse(await read(`${dir}/package.json`, 'utf8'));
      collectVersions(meta, 'dependencies');
      collectVersions(meta, 'devDependencies');
      collectVersions(meta, 'peerDependencies');
      collectVersions(meta, 'optionalDependencies');
    })
  );
  Object.keys(versions).forEach(name => {
    if (Object.keys(versions[name]).length === 1) delete versions[name];
  });

  return versions;
};

/*::
export type Addition = {
  name: string,
  range: string,
  type: string,
};
export type AddArgs = {
  roots: Array<string>,
  additions?: Array<Addition>,
  ignore?: Array<string>,
  tmp?: string,
};
export type Add = (AddArgs) => Promise<void>;
*/
const add /*: Add */ = async ({roots, additions, ignore, tmp}) => {
  await diff({roots, additions, ignore, tmp});
};

/*::
export type RemoveArgs = {
  roots: Array<string>,
  removals?: Array<string>,
  ignore?: Array<string>,
  tmp?: string,
};
export type Remove = (RemoveArgs) => Promise<void>;
*/
const remove /*: Remove */ = async ({roots, removals, ignore, tmp}) => {
  await diff({roots, removals, ignore, tmp});
};

/*::
export type Upgrading = {
  name: string,
  range?: string,
  from?: string,
};
export type UpgradeArgs = {
  roots: Array<string>,
  upgrades?: Array<Upgrading>,
  ignore?: Array<string>,
  tmp?: string,
};
export type Upgrade = (UpgradeArgs) => Promise<void>;
*/
const upgrade /*: Upgrade */ = async ({roots, upgrades, ignore, tmp}) => {
  await diff({roots, upgrades, ignore, tmp});
};

/*::
export type SyncArgs = {
  roots: Array<string>,
  ignore: Array<string>,
};
export type Sync = (SyncArgs) => Promise<void>;
*/
const sync /*: Sync */ = async ({roots, ignore}) => {
  const sets = await readVersionSets({roots});
  await syncLockfiles({sets, ignore, frozenLockfile: false});
  await writeVersionSets({sets});
};

/*::
export type RegenerateArgs = {
  roots: Array<string>,
  ignore?: Array<string>,
  tmp?: string,
  frozenLockfile?: boolean,
};
export type Regenerate = (RegenerateArgs) => Promise<void>;
*/
const regenerate /*: Regenerate */ = async ({
  roots,
  ignore,
  tmp,
  frozenLockfile = false,
}) => {
  await diff({roots, ignore, tmp, frozenLockfile});
};

/*::
export type MergeArgs = {
  roots: Array<string>,
  out: string,
  ignore?: Array<string>,
  tmp?: string,
}
export type Merge = (MergeArgs) => Promise<void>;
*/
const merge /*: Merge */ = async ({roots, out, ignore = [], tmp = '/tmp'}) => {
  const sets = await readVersionSets({roots});
  const merged = {dir: out, meta: {}, lockfile: {}};
  for (const {meta, lockfile} of sets) {
    for (const {name, range, type} of getDepEntries(meta)) {
      const ignored = ignore.find(dep => dep === name);
      if (ignored) continue;

      if (!merged.meta[type]) merged.meta[type] = {};
      merged.meta[type][name] = range;
    }
    Object.assign(merged.lockfile, lockfile);
  }
  await writeVersionSets({sets: [merged]});
};

/*::
type DiffArgs = {
  roots: Array<string>,
  additions?: Array<Addition>,
  removals?: Array<string>,
  upgrades?: Array<Upgrading>,
  ignore?: Array<string>,
  frozenLockfile?: boolean,
  tmp?: string,
};
type Diff = (DiffArgs) => Promise<void>;
*/
const diff /*: Diff */ = async ({
  roots,
  additions = [],
  removals = [],
  upgrades = [],
  ignore = [],
  frozenLockfile = false,
  tmp = '/tmp',
}) => {
  const sets = await readVersionSets({roots});
  const updated = /*:: await */ await update({
    sets,
    additions,
    removals,
    upgrades,
    ignore,
    frozenLockfile,
    tmp,
  });
  if (!frozenLockfile) await writeVersionSets({sets: updated});
};

const readVersionSets = async ({roots}) => {
  return Promise.all(
    roots.map(async dir => {
      const metaFile = `${dir}/package.json`;
      const meta = JSON.parse(await read(metaFile, 'utf8').catch(() => '{}'));

      const yarnLock = `${dir}/yarn.lock`;
      const {object} = parse(await read(yarnLock, 'utf8').catch(() => ''));

      return {dir, meta, lockfile: object};
    })
  );
};

const writeVersionSets = async ({sets}) => {
  await Promise.all(
    sets.map(async ({dir, meta, lockfile}) => {
      await exec(`mkdir -p ${dir}`);
      await write(
        `${dir}/package.json`,
        `${JSON.stringify(meta, null, 2)}\n`,
        'utf8'
      );
      await write(`${dir}/yarn.lock`, stringify(lockfile), 'utf8');
    })
  );
};

const getDepEntries = meta => {
  const entries = [];
  const types = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
    'resolutions',
  ];
  for (const type of types) {
    for (const name in meta[type]) {
      const realName =
        type === 'resolutions'
          ? (name.match(/(@[^@/]+?\/)?[^@/]+$/) || [])[0]
          : name;
      entries.push({name: realName, range: meta[type][name], type});
    }
  }
  return entries;
};

/*::
import type {PackageJson} from './get-local-dependencies.js';

export type LockfileEntry = {
  version: string,
  resolved: string,
  dependencies?: {
    [string]: string,
  }
};
export type Lockfile = {
  [string]: LockfileEntry,
};
export type VersionSet = {
  dir: string,
  meta: PackageJson,
  lockfile: Lockfile,
};
export type UpdateArgs = {
  sets: Array<VersionSet>,
  additions?: Array<Addition>,
  removals?: Array<string>,
  upgrades?: Array<Upgrading>,
  ignore?: Array<string>,
  frozenLockfile?: boolean,
  tmp?: string,
};
export type Update = (UpdateArgs) => Promise<Array<VersionSet>>;
*/
const update /*: Update */ = async ({
  sets,
  additions = [],
  removals = [],
  upgrades = [],
  ignore = [],
  frozenLockfile = false,
  tmp = '/tmp',
}) => {
  // note: this function mutates metadata and lockfile structures in `sets` if:
  // - the originating command was either `add`, `remove` or `upgrade`
  // - a dep was added to or upgraded in a package.json manually
  // - a resolution was manually added or modified
  //
  // it does not sync lockfiles if:
  // - a dep was removed from package.json manually (use the dedupe command to clean up in that case)
  // - a dep (top-level or transitive) has a new compatible version in the registry but there are no changes locally

  // populate missing ranges w/ latest
  await ensureInsertionRanges([...additions, ...upgrades]);

  let shouldSyncLockfiles = false;
  const cache = {};
  for (const {dir, meta, lockfile} of sets) {
    applyMetadataChanges({meta, removals, additions, upgrades});
    const hasLockfileChanges = await installMissingDeps({
      dir,
      meta,
      lockfile,
      ignore,
      tmp,
      cache,
    });
    const hasRemovals = removals.length > 0;
    const hasAdditions = additions.length > 0;
    const hasUpgrades = upgrades.length > 0;
    const hasMetadataChanges = hasRemovals || hasAdditions || hasUpgrades;
    if (hasMetadataChanges || hasLockfileChanges) shouldSyncLockfiles = true;
  }

  if (shouldSyncLockfiles) {
    await syncLockfiles({sets, ignore, frozenLockfile});
  }

  return sets;
};

const ensureInsertionRanges = async insertions => {
  // this function mutates `insertions`
  if (insertions.length > 0) {
    await Promise.all(
      insertions.map(async insertion => {
        if (!insertion.range) {
          const cmd = `yarn info ${insertion.name} version --json`;
          const info = await exec(cmd, {env: process.env});
          const {data} = JSON.parse(info);
          insertion.range = `^${data}`; // eslint-disable-line require-atomic-updates
        }
      })
    );
  }
};

const applyMetadataChanges = ({meta, removals, additions, upgrades}) => {
  // this function mutates `meta.dependencies`, `.devDependencies`, etc, then returns `meta`
  applyMetadataRemovals({meta, removals});
  applyMetadataAdditions({meta, additions});
  applyMetadataUpgrades({meta, upgrades});
};

const applyMetadataRemovals = ({meta, removals}) => {
  if (removals.length > 0) {
    for (const name of removals) {
      const types = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'resolutions',
      ];
      for (const type of types) {
        if (meta[type]) {
          if (meta[type][name]) delete meta[type][name];
          if (Object.keys(meta[type]).length === 0) delete meta[type];
        }
      }
    }
  }
};

const applyMetadataAdditions = ({meta, additions}) => {
  if (additions.length > 0) {
    for (const {name, range, type} of additions) {
      if (!meta[type]) meta[type] = {};
      meta[type][name] = range;
    }
  }
};

const applyMetadataUpgrades = ({meta, upgrades}) => {
  if (upgrades.length > 0) {
    for (const {name, range, from} of upgrades) {
      const types = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'resolutions',
      ];
      for (const type of types) {
        if (meta[type] && meta[type][name] && range) {
          if (!from || satisfies(minVersion(meta[type][name]), from)) {
            meta[type][name] = range;
          }
        }
      }
    }
  }
};

const installMissingDeps = async ({
  dir,
  meta,
  lockfile,
  ignore,
  tmp,
  cache,
}) => {
  let edited = false;

  // generate lockfile entries for missing top level deps
  const missing = {};
  const cacheKeyParts = [];
  for (const {name, range, type} of getDepEntries(meta)) {
    if (!lockfile[`${name}@${range}`] && !ignore.find(dep => dep === name)) {
      if (!missing[type]) missing[type] = {};
      missing[type][name] = range;
      cacheKeyParts.push(`${name}@${range}`);
    }
  }
  if (Object.keys(missing).length > 0) {
    const cwd = `${tmp}/yarn-utils-${Math.random() * 1e17}`;
    const yarnrc = await getYarnRc(dir);

    // install missing deps and reuse promise in parallel runs if possible
    const cacheKey = `${cacheKeyParts.join(' ')} | ${yarnrc}`;
    if (!cache[cacheKey]) {
      const install = async () => {
        await exec(`mkdir -p ${cwd}`);
        await write(
          `${cwd}/package.json`,
          `${JSON.stringify(missing, null, 2)}\n`,
          'utf8'
        );
        await write(`${cwd}/.yarnrc`, yarnrc, 'utf8');

        const install = `${node} ${yarn} install --ignore-scripts --ignore-engines`;
        await exec(install, {cwd}, [process.stdout, process.stderr]);
        return cwd;
      };
      cache[cacheKey] = install(); // cache the promise
    }
    const cachedCwd = await cache[cacheKey];

    // copy newly installed deps back to original package.json/yarn.lock
    const [added] = await readVersionSets({roots: [cachedCwd]});
    for (const {name, range, type} of getDepEntries(added.meta)) {
      if (!meta[type]) meta[type] = {};
      if (meta[type]) meta[type][name] = range;
    }
    for (const key in added.lockfile) {
      if (!lockfile[key]) {
        lockfile[key] = added.lockfile[key];
        edited = true;
      }
    }
  }

  // generate lockfile entries for missing transitives
  const missingTransitives = [];
  for (const key in lockfile) {
    if (lockfile[key].dependencies) {
      for (const name in lockfile[key].dependencies) {
        const range = lockfile[key].dependencies[name];
        if (!lockfile[`${name}@${range}`]) {
          missingTransitives.push(`${name}@${range}`);
        }
      }
    }
  }
  if (missingTransitives.length > 0) {
    const cwd = `${tmp}/yarn-utils-${Math.random() * 1e17}`;
    const yarnrc = await getYarnRc(dir);

    // add missing transitives and reuse promise in parallel runs if possible
    const cacheKey = `${missingTransitives.join(' ')} | ${yarnrc}`;
    if (!cache[cacheKey]) {
      const add = async () => {
        await exec(`mkdir -p ${cwd}`);
        await write(`${cwd}/.yarnrc`, yarnrc, 'utf8');

        await write(`${cwd}/package.json`, '{}\n', 'utf8');
        const deps = missingTransitives.join(' ');
        const add = `yarn add ${deps} --ignore-engines`;
        await exec(add, {cwd}, [process.stdout, process.stderr]);
        return cwd;
      };
      cache[cacheKey] = add(); // cache promise
    }
    const cachedCwd = await cache[cacheKey];

    // copy newly installed deps back to original yarn.lock
    const [added] = await readVersionSets({roots: [cachedCwd]});
    for (const key in added.lockfile) {
      if (!lockfile[key]) {
        lockfile[key] = added.lockfile[key];
        edited = true;
      }
    }
  }
  return edited;
};

const indexLockfiles = ({sets}) => {
  // "index" in the dababase sense: makes it fast to lookup items in `sets` based on package name
  const index = {};
  for (const {lockfile, meta} of sets) {
    for (const key in lockfile) {
      const [, name, range] = key.match(/(.+?)@(.+)/) || [];
      const isExact =
        range.includes(':') ||
        range.includes('/') ||
        isYarnResolution({meta, name});
      if (!index[name]) index[name] = [];
      index[name].push({
        lockfile,
        key,
        isExact,
      });
    }
  }
  for (const name in index) {
    index[name].sort((a, b) => {
      const aVersion = a.lockfile[a.key].version;
      const bVersion = b.lockfile[b.key].version;
      return b.isExact - a.isExact || compare(bVersion, aVersion);
    });
  }
  return index;
};

const syncLockfiles = async ({sets, ignore, frozenLockfile}) => {
  const log = s => process.stdout.write(s);
  log('Checking lockfiles');

  const index = indexLockfiles({sets});

  for (const item of sets) {
    const {dir, meta} = item;
    const registry = await getRegistry(dir);
    const graph = {};
    log('.');
    for (const {name, range} of getDepEntries(meta)) {
      const ignored = ignore.find(dep => dep === name);
      if (!ignored) {
        populateGraph({
          graph,
          name,
          range,
          index,
          registry,
        });
      }
    }

    // @yarnpkg/lockfile generates separate entries if entry bodies aren't referentially equal
    // so we need to ensure that they are
    const map = {};
    const lockfile = {};
    for (const key in graph) {
      const [, name] = key.match(/(.+?)@(.+)/) || [];
      map[`${name}@${graph[key].resolved}`] = graph[key];
    }
    for (const key in graph) {
      const [, name] = key.match(/(.+?)@(.+)/) || [];
      lockfile[key] = map[`${name}@${graph[key].resolved}`];
    }

    if (frozenLockfile) {
      const oldKeys = Object.keys(item.lockfile);
      const newKeys = Object.keys(lockfile);
      if (oldKeys.sort().join() !== newKeys.sort().join()) {
        throw new Error(
          `Updating lockfile is not allowed with frozenLockfile. ` +
            `This error is most likely happening if you have committed ` +
            `out-of-date lockfiles and tried to install deps in CI. ` +
            `Install your deps again locally.`
        );
      }
    } else {
      item.lockfile = lockfile;
    }
  }
  log('\n');
};

/*::
type IndexEntry = {
  key: string,
  lockfile: Lockfile,
  isExact: boolean,
}
type PopulateGraphArgs = {
  graph: Lockfile,
  name: string,
  range: string,
  index: {[string]: Array<IndexEntry>},
  registry: string,
}
type PopulateGraph = (PopulateGraphArgs) => void;
*/
const populateGraph /*: PopulateGraph */ = ({
  graph,
  name,
  range,
  index,
  registry,
}) => {
  const key = `${name}@${range}`;
  if (key in graph) return;

  // Prefer newer versions of packages that adhere to the local registry of the package
  // If this fails, then disregard the registry check and loop
  for (const ptr of index[name]) {
    const version = ptr.lockfile[ptr.key].version;
    if (!ptr.isExact && isBetterVersion(version, range, graph, key)) {
      const {resolved} = ptr.lockfile[ptr.key];
      if (resolved.indexOf(registry) > -1) {
        graph[key] = ptr.lockfile[ptr.key];
      }
    } else if (ptr.isExact && key === ptr.key) {
      graph[key] = ptr.lockfile[ptr.key];
      break;
    }
  }

  if (!graph[key]) return;
  populateDeps({
    graph,
    deps: graph[key].dependencies || {},
    index,
    registry,
  });
};

const populateDeps = ({graph, deps, index, registry}) => {
  for (const name in deps) {
    const range = deps[name];
    populateGraph({graph, name, range, index, registry});
  }
};

const isBetterVersion = (version, range, graph, key) => {
  return (
    satisfies(version, range) &&
    (!graph[key] || gt(version, graph[key].version))
  );
};

const getRegistry = async cwd => {
  const getRegistry = `${node} ${yarn} config get registry`;
  const registry = await exec(getRegistry, {cwd});
  return registry ? registry.trim() : '';
};

const getYarnRc = async packageDir => {
  const yarnrc = ['"--install.frozen-lockfile" false'];
  const registry = await getRegistry(packageDir);
  if (registry) {
    yarnrc.push(`--registry "${registry}"`);
  }
  return yarnrc.join('\n');
};

module.exports = {
  check,
  add,
  remove,
  upgrade,
  sync,
  regenerate,
  merge,
  populateGraph,
};
