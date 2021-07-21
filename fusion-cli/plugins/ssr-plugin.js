/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* eslint-env node */
/* global __webpack_public_path__ */

import {
  createPlugin,
  escape,
  consumeSanitizedHTML,
  CriticalChunkIdsToken,
  RoutePrefixToken,
  getEnv,
} from 'fusion-core';

import {
  chunks,
  runtimeChunkIds,
  initialChunkIds, // $FlowFixMe
} from '../build/loaders/chunk-manifest-loader.js!'; // eslint-disable-line

import modernBrowserVersions from '../build/modern-browser-versions.js';

/*::
import type {SSRBodyTemplateDepsType, SSRBodyTemplateType} from './types.js';
declare var __webpack_public_path__: string;
*/

/* eslint-disable-next-line */
const SSRBodyTemplate = createPlugin/*:: <SSRBodyTemplateDepsType,SSRBodyTemplateType> */(
    {
      deps: {
        criticalChunkIds: CriticalChunkIdsToken.optional,
        routePrefix: RoutePrefixToken.optional,
      },
      provides: ({criticalChunkIds, routePrefix}) => {
        const {dangerouslyExposeSourceMaps} = getEnv();
        return (ctx) => {
          const {htmlAttrs, bodyAttrs, title, head, body} = ctx.template;
          const safeAttrs = Object.keys(htmlAttrs)
            .map((attrKey) => {
              return ` ${escape(attrKey)}="${escape(htmlAttrs[attrKey])}"`;
            })
            .join('');

          const safeBodyAttrs = Object.keys(bodyAttrs)
            .map((attrKey) => {
              return ` ${escape(attrKey)}="${escape(bodyAttrs[attrKey])}"`;
            })
            .join('');

          const safeTitle = escape(title);
          // $FlowFixMe
          const safeHead = head.map(consumeSanitizedHTML).join('');
          // $FlowFixMe
          const safeBody = body.map(consumeSanitizedHTML).join('');

          const coreGlobals = [
            `<script nonce="${ctx.nonce}">`,
            `window.performance && window.performance.mark && window.performance.mark('firstRenderStart');`,
            routePrefix && `__ROUTE_PREFIX__ = ${JSON.stringify(routePrefix)};`,
            `__FUSION_ASSET_PATH__ = ${JSON.stringify(
              __webpack_public_path__
            )};`, // consumed in src/entries/client-public-path.js
            `__NONCE__ = ${JSON.stringify(ctx.nonce)}`, // consumed in src/entries/client-public-path.js
            `</script>`,
          ]
            .filter(Boolean)
            .join('');

          const tokenCriticalChunkIds = criticalChunkIds
            ? criticalChunkIds.from(ctx)
            : new Set();

          const allCriticalChunkIds = new Set([
            ...initialChunkIds,
            // For now, take union of both ctx and token
            ...ctx.preloadChunks,
            ...tokenCriticalChunkIds,
            // runtime chunk must be last script
            ...runtimeChunkIds,
          ]);

          const legacyUrls = [];
          const modernUrls = [];

          for (let chunkId of allCriticalChunkIds) {
            const url = chunks.get(chunkId);
            if (url.includes('client-legacy')) {
              legacyUrls.push(url);
            } else {
              modernUrls.push(url);
            }
          }

          const isModernBrowser = checkModuleSupport(ctx.useragent.browser);

          if (__DEV__) {
            if (!isModernBrowser && legacyUrls.length === 0) {
              return `<!DOCTYPE html>
<html>
<head>
</head>
<body style="padding:20vmin;font-family:sans-serif;font-size:16px;background:papayawhip">
<p>You are using a legacy browser but only the modern bundle has been built (legacy bundles are skipped by default when using <code style="display:inline">fusion dev</code>)
 or when using using <code style="display:inline">fusion build</code> with the --modernBuildOnly flag.</p>
<p>Please use a modern browser, <pre><code style="display:inline">fusion dev --forceLegacyBuild</code></pre> or
<pre><code style="display:inline">fusion build</code></pre> with no --modernBuildOnly flag to build the legacy bundle.</p>
<p>For more information, see the docs on <a href="https://github.com/fusionjs/fusion-cli/blob/master/docs/progressively-enhanced-bundles.md">progressively enhanced bundles</a>.</p>
</body>
</html>`;
            }
          }

          const criticalChunkUrls =
            isModernBrowser || legacyUrls.length === 0
              ? modernUrls
              : legacyUrls;
          let criticalChunkScripts = [];
          let preloadHints = [];

          for (let url of criticalChunkUrls) {
            if (!__DEV__ && dangerouslyExposeSourceMaps) {
              // Use -with-map.js bundles
              url = addWithMap(url);
            }
            const crossoriginAttr = process.env.CDN_URL
              ? ' crossorigin="anonymous"'
              : '';
            preloadHints.push(
              `<link rel="preload" href="${url}" nonce="${ctx.nonce}"${crossoriginAttr} as="script"/>`
            );
            criticalChunkScripts.push(
              `<script defer src="${url}" nonce="${ctx.nonce}"${crossoriginAttr}></script>`
            );
          }

          return [
            '<!doctype html>',
            `<html${safeAttrs}>`,
            `<head>`,
            `<meta charset="utf-8" />`,
            `<title>${safeTitle}</title>`,
            `${preloadHints.join('')}${coreGlobals}${criticalChunkScripts.join(
              ''
            )}${safeHead}`,
            `</head>`,
            `<body${safeBodyAttrs}>${ctx.rendered}${safeBody}</body>`,
            '</html>',
          ].join('');
        };
      },
    }
  );

export {SSRBodyTemplate};

const embeddedBrowserVersions = {
  ios_webkit: 605, // mobile safari v13
};

/*
Edge must get transpiled classes due to:
- https://github.com/Microsoft/ChakraCore/issues/5030
- https://github.com/Microsoft/ChakraCore/issues/4663
- https://github.com/babel/babel/issues/8019
Rather than transpile classes in the modern bundles, Edge should be forced on the slow path

Safari 10.1 and 11 have some ES6 bugs:
- https://github.com/mishoo/UglifyJS2/issues/1753
- https://github.com/mishoo/UglifyJS2/issues/2344
- https://github.com/terser-js/terser/issues/117
Rather than enable terser workarounds that reduces minification for compliant browsers,
Safari 10.1 and 11 should be treated as legacy.
*/
function checkModuleSupport({name, version}) {
  if (typeof version !== 'string') {
    return false;
  }
  if (name === 'Chrome' || name === 'Chrome Headless' || name === 'Chromium') {
    if (majorVersion(version) >= modernBrowserVersions.chrome) return true;
  } else if (name === 'Chrome WebView') {
    if (majorVersion(version) >= modernBrowserVersions.android) return true;
  } else if (name === 'WebKit') {
    if (majorVersion(version) >= embeddedBrowserVersions.ios_webkit)
      return true;
  } else if (name === 'Safari') {
    if (majorVersion(version) >= modernBrowserVersions.safari) return true;
  } else if (name === 'Mobile Safari') {
    if (majorVersion(version) >= modernBrowserVersions.ios) return true;
  } else if (name === 'Firefox') {
    if (majorVersion(version) >= modernBrowserVersions.firefox) return true;
  } else if (name === 'Edge') {
    if (majorVersion(version) >= modernBrowserVersions.edge) return true;
  }
  return false;
}

function majorVersion(version) {
  return parseInt(version.split('.')[0], 10);
}

function addWithMap(url) {
  if (url.endsWith('-with-map.js')) {
    return url;
  } else {
    return url.replace(/\.js$/, '-with-map.js');
  }
}
