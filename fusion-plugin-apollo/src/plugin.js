/** Copyright (c) 2019 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import React from 'react';
import {UniversalEventsToken} from 'fusion-plugin-universal-events';
import {createPlugin, html, unescape, RouteTagsToken} from 'fusion-core';

import {ApolloProvider} from '@apollo/react-common';

import type {Context, Render} from 'fusion-core';

import serverRender from './server';
import {LoggerToken} from 'fusion-tokens';
import {ApolloServer} from 'apollo-server-koa';
import compose from 'koa-compose';
import {
  ApolloContextToken,
  ApolloCacheContext,
  GetDataFromTreeToken,
  GraphQLSchemaToken,
  GraphQLEndpointToken,
  ApolloClientToken,
  ApolloBodyParserConfigToken,
  ApolloDefaultOptionsConfigToken,
} from './tokens';

export type DepsType = {
  RouteTags: typeof RouteTagsToken,
  apolloContext: typeof ApolloContextToken.optional,
  logger: typeof LoggerToken.optional,
  schema: typeof GraphQLSchemaToken.optional,
  endpoint: typeof GraphQLEndpointToken.optional,
  getApolloClient: typeof ApolloClientToken,
  getDataFromTree: typeof GetDataFromTreeToken.optional,
  bodyParserConfig: typeof ApolloBodyParserConfigToken.optional,
  defaultOptionsConfig: typeof ApolloDefaultOptionsConfigToken.optional,
  emitter: typeof UniversalEventsToken.optional,
};

export type ProvidesType = (el: any, ctx: Context) => Promise<any>;

function getDeps(): DepsType {
  if (__NODE__) {
    return {
      RouteTags: RouteTagsToken,
      apolloContext: ApolloContextToken.optional,
      logger: LoggerToken.optional,
      schema: GraphQLSchemaToken.optional,
      endpoint: GraphQLEndpointToken.optional,
      getApolloClient: ApolloClientToken,
      getDataFromTree: GetDataFromTreeToken.optional,
      bodyParserConfig: ApolloBodyParserConfigToken.optional,
      defaultOptionsConfig: ApolloDefaultOptionsConfigToken.optional,
      emitter: UniversalEventsToken.optional,
    };
  }
  // $FlowFixMe
  return {
    getApolloClient: ApolloClientToken,
  };
}

export default (renderFn: Render) =>
  createPlugin<DepsType, ProvidesType>({
    deps: getDeps(),
    provides(deps) {
      if (__BROWSER__) {
        return renderFn;
      }
      return (el, ctx) => {
        return serverRender(el, deps.logger, deps.getDataFromTree, deps.emitter).then(() => {
          return renderFn(el, ctx);
        });
      };
    },
    middleware({
      RouteTags,
      logger,
      schema,
      endpoint = '/graphql',
      getApolloClient,
      apolloContext = (ctx) => {
        return ctx;
      },
      bodyParserConfig = {},
      defaultOptionsConfig = {},
    }) {
      const renderMiddleware = async (ctx, next) => {
        if (!ctx.element) {
          return next();
        }
        let initialState = null;
        if (__BROWSER__) {
          // Deserialize initial state for the browser
          const apolloState = document.getElementById('__APOLLO_STATE__');
          if (apolloState) {
            initialState = JSON.parse(unescape(apolloState.textContent));
          }
        }
        // Create the client and apollo provider
        const client = getApolloClient(ctx, initialState);
        ctx.element = (
          <ApolloCacheContext.Provider value={client.cache}>
            <ApolloProvider client={client}>{ctx.element}</ApolloProvider>
          </ApolloCacheContext.Provider>
        );

        await next();

        if (__NODE__) {
          // Serialize state into html on server side render
          const initialState = client.cache && client.cache.extract();
          const serialized = JSON.stringify(initialState);
          // eslint-disable-next-line prettier/prettier
          const script = html`
            <script type="application/json" id="__APOLLO_STATE__">
              ${String(serialized)}
            </script>
          `;
          ctx.template.body.push(script);
        }
      };
      if (__NODE__ && schema) {
        const getApolloContext = (ctx) => {
          if (typeof apolloContext === 'function') {
            return apolloContext(ctx);
          }
          return apolloContext;
        };
        const server = new ApolloServer({
          formatError: (error) => {
            logger && logger.error(error.message, error);
            return error;
          },
          ...defaultOptionsConfig,
          schema,
          // investigate other options
          context: ({ctx}) => {
            return ctx;
          },
          executor: async (requestContext) => {
            const fusionCtx = requestContext.context;
            const routeTags = RouteTags.from(fusionCtx);
            routeTags.name = 'graphql';
            const apolloCtx = getApolloContext(fusionCtx);
            const client = getApolloClient(fusionCtx, {});
            // $FlowFixMe
            const queryObservable = client.queryManager.getObservableFromLink(
              requestContext.document,
              apolloCtx,
              requestContext.request.variables
            );
            return new Promise((resolve, reject) => {
              queryObservable.subscribe({
                next(x) {
                  resolve(x);
                },
                error(err) {
                  reject(err);
                },
              });
            });
          },
        });
        let serverMiddleware = [];
        server.applyMiddleware({
          // switch to server.getMiddleware once https://github.com/apollographql/apollo-server/pull/2435 lands
          app: {
            use: (m) => {
              serverMiddleware.push(m);
            },
          },
          // investigate other options
          path: endpoint,
          bodyParserConfig,
        });
        return compose([...serverMiddleware, renderMiddleware]);
      } else {
        return renderMiddleware;
      }
    },
  });
