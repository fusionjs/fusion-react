// @flow
const {resolve, dirname} = require('path');
const {exists} = require('./node-helpers.js');

async function getRootDir({dir}) {
  dir = resolve(dir);
  if (await exists(`${dir}/manifest.json`)) {
    return dir;
  } else if (dir !== '/') {
    return getRootDir({dir: dirname(dir)});
  } else {
    throw new Error(
      'No root directory could be found. Make sure you have created a manifest.json file'
    );
  }
}

module.exports.getRootDir = getRootDir;
