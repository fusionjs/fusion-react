// @flow
const {spawn, read, write} = require('./node-helpers.js');
const {version} = require('../package.json');

/*::
export type ScaffoldArgs = {
  cwd: string,
};
export type Scaffold = (ScaffoldArgs) => Promise<void>;
*/
const scaffold /*: Scaffold */ = async ({cwd}) => {
  try {
    await spawn('cp', ['-rn', `${__dirname}/../templates/scaffold/.`, cwd]);
  } catch (e) {
    // this command may exit 1 due to -n but we don't care if it does
  }
  const workspace = await read(`${cwd}/WORKSPACE`, 'utf8');
  const versioned = workspace.replace(/VERSION/, version);
  await write(`${cwd}/WORKSPACE`, versioned, 'utf8');
};

module.exports = {scaffold};
