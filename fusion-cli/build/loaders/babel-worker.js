/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* eslint-env node */

const PersistentDiskCache = require('../persistent-disk-cache.js');
const TranslationsExtractor = require('../babel-plugins/babel-plugin-i18n');
const path = require('path');
const babel = require('@babel/core');

/*::
import type {TranslationsDiscoveryContext} from "./loader-context.js";
*/

module.exports = {
  runTransformation,
};

let cache;

function getCache(cacheDir) {
  if (!cache) {
    cache = new PersistentDiskCache(cacheDir);
  }
  return cache;
}

async function runTransformation(
  source /*: string */,
  options /*: Object */,
  inputSourceMap /*: Object */,
  discoveryState /*: TranslationsDiscoveryContext*/,
  cacheKey /*: string */,
  filename /*: string */
) {
  const cacheDir = path.join(process.cwd(), 'node_modules/.fusion_babel-cache');

  const diskCache = getCache(cacheDir);

  const result = await diskCache.get(cacheKey, () => {
    let metadata = {};

    let translationIds = new Set();
    // Add the discovery plugin
    // This only does side effects, so it is ok this doesn't affect cache key
    // This plugin is here because webpack config -> loader options
    // requires serialization. But we want to pass translationsIds directly.
    options.plugins.unshift([TranslationsExtractor, {translationIds}]);

    // make the ast
    const transformed = transform(source, options);

    if (translationIds.size > 0) {
      metadata.translationIds = Array.from(translationIds.values());
    }

    if (!transformed) {
      return null;
    }

    return {metadata, ...transformed};
  });

  if (result) {
    // $FlowFixMe
    const {code, map, metadata} = result;

    if (discoveryState && metadata.translationIds) {
      discoveryState.set(filename, new Set(metadata.translationIds));
    }

    return [code, map];
  }

  // If the file was ignored, pass through the original content.
  return [source, inputSourceMap];
}

function transform(source, options) {
  let result;
  try {
    result = babel.transformSync(source, options);
  } catch (err) {
    throw err.message && err.codeFrame ? new LoaderError(err) : err;
  }

  if (!result) return null;

  // We don't return the full result here because some entries are not
  // really serializable. For a full list of properties see here:
  // https://github.com/babel/babel/blob/master/packages/babel-core/src/transformation/index.js
  // For discussion on this topic see here:
  // https://github.com/babel/babel-loader/pull/629
  const {code, map, sourceType} = result;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {code, map, sourceType};
}

class LoaderError extends Error {
  /*::
  hideStack: boolean
  */
  constructor(err) {
    super();
    const {name, message, codeFrame, hideStack} = formatError(err);
    this.name = 'BabelLoaderError';
    this.message = `${name ? `${name}: ` : ''}${message}\n\n${codeFrame}\n`;
    this.hideStack = hideStack;
    Error.captureStackTrace(this, this.constructor);
  }
}

const STRIP_FILENAME_RE = /^[^:]+: /;

function formatError(err) {
  if (err instanceof SyntaxError) {
    err.name = 'SyntaxError';
    err.message = err.message.replace(STRIP_FILENAME_RE, '');
    err.hideStack = true;
  } else if (err instanceof TypeError) {
    err.name = null;
    err.message = err.message.replace(STRIP_FILENAME_RE, '');
    err.hideStack = true;
  }
  return err;
}