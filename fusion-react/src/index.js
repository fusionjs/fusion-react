/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env browser */
import * as React from 'react';

import FusionApp, {
  createToken,
  createPlugin,
  CriticalChunkIdsToken,
  type Context,
} from 'fusion-core';
import {prepare} from './async/index.js';
import PrepareProvider from './async/prepare-provider';
import {LoggerToken} from 'fusion-tokens';
import {UniversalEventsToken} from 'fusion-plugin-universal-events';

import serverRender from './server';
import clientRender from './client';

import ProviderPlugin from './plugin';
import ProvidedHOC from './hoc';
import Provider from './provider';

import {
  FusionContext,
  ServiceConsumer,
  ServiceContext,
  useService,
  withServices,
} from './context.js';

export const SkipPrepareToken = createToken<boolean>('SkipPrepareToken');

export type Render = (el: React.Element<*>, context: Context) => any;

declare var __NODE__: Boolean;

export default class App extends FusionApp {
  constructor(root: React.Element<*>, render: ?Render) {
    if (!React.isValidElement(root)) {
      throw new Error(
        'Invalid React element. Ensure your root element is a React.Element (e.g. <Foo />) and not a React.Component (e.g. Foo)'
      );
    }
    const getService = (token) => {
      // $FlowFixMe
      const provides = this.getService(token);
      const isRequiredToken = Boolean(token.optional);
      if (typeof provides === 'undefined' && isRequiredToken) {
        throw new Error(
          `Token ${token.name} not registered or registered plugin does not provide a service. To use an optional plugin, use \`Token.optional\`.`
        );
      }
      return provides;
    };
    const renderer = createPlugin({
      deps: {
        criticalChunkIds: CriticalChunkIdsToken.optional,
        skipPrepare: SkipPrepareToken.optional,
        logger: LoggerToken.optional,
        emitter: UniversalEventsToken.optional,
      },
      provides({skipPrepare, logger}) {
        return (el: React.Element<*>, ctx) => {
          return (skipPrepare ? Promise.resolve() : prepare(el, ctx))
            .catch(() => {}) // recover from failed `prepare`
            .then(() => {
              if (render) {
                return render(el, ctx);
              }
              if (__NODE__) {
                return serverRender(el, logger, emitter);
              } else {
                return clientRender(el);
              }
            });
        };
      },
      middleware({criticalChunkIds}) {
        return (ctx, next) => {
          if (__NODE__ && !ctx.element) {
            return next();
          }

          const markAsCritical = __NODE__
            ? (chunkId) => {
                // Push to legacy context for backwards compat w/ legacy SSR template
                ctx.preloadChunks.push(chunkId);

                // Also use new service if registered
                if (criticalChunkIds) {
                  let chunkIds = criticalChunkIds.from(ctx);
                  chunkIds.add(chunkId);
                }
              }
            : noop;

          // This is used to collect arbitrary metadata during a given SSR
          // The primary use case is to collect bundler-specific information
          // about import() statements encountered during SSR so that async
          // bundle-split client code can be preloaded/fetched appropriately
          ctx.ssrMetadata = [];
          const pushSSRMetadata = __NODE__
            ? (metadata) => {
                ctx.ssrMetadata.push(metadata);
              }
            : noop;

          ctx.element = (
            <PrepareProvider
              markAsCritical={markAsCritical}
              pushSSRMetadata={pushSSRMetadata}
            >
              <FusionContext.Provider value={ctx}>
                <ServiceContext.Provider value={getService}>
                  {ctx.element}
                </ServiceContext.Provider>
              </FusionContext.Provider>
            </PrepareProvider>
          );
          return next();
        };
      },
    });
    super(root, renderer);
  }
}

export {
  FusionContext,
  ProviderPlugin,
  ProvidedHOC,
  Provider,
  ServiceConsumer,
  ServiceContext,
  useService,
  withServices,
};

function noop() {}

export * from './async/index.js';
