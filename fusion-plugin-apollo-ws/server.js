// @flow

/* eslint-disable no-console */
import {createPlugin, HttpServerToken, type Context} from 'fusion-core';
import {SubscriptionServer} from 'subscriptions-transport-ws';
import {GraphQLSchemaToken, GraphQLEndpointToken} from 'fusion-plugin-apollo';
import {execute, subscribe} from 'graphql';
import {SecureHeadersCSPConfigToken} from '@uber/fusion-plugin-secure-headers';
import {getWebSocketURL} from './utils';
import {ApolloWebSocketConfigToken} from './tokens';

const setCspOverrides = (csp: Object, ctx: Context) => {
  csp.overrides = {
    ...csp.overrides,
    connectSrc: [
      ...new Set([
        ...((csp.overrides && csp.overrides.connectSrc) || []),
        getWebSocketURL({host: ctx.host}),
      ]),
    ],
  };
};

type Deps = {
  csp: typeof SecureHeadersCSPConfigToken,
  schema: typeof GraphQLSchemaToken,
  server: typeof HttpServerToken,
  defaultPath: typeof GraphQLEndpointToken.optional,
  config: typeof ApolloWebSocketConfigToken.optional,
};
export default createPlugin<Deps, void>({
  deps: {
    csp: SecureHeadersCSPConfigToken,
    schema: GraphQLSchemaToken,
    server: HttpServerToken,
    defaultPath: GraphQLEndpointToken.optional,
    config: ApolloWebSocketConfigToken.optional,
  },
  provides: ({
    schema,
    server,
    defaultPath = '/graphql',
    config: {
      endpoint: path = defaultPath,
      server: {options: serverOptions = {}} = {},
    } = {},
  }) => {
    new SubscriptionServer(
      {
        ...serverOptions,
        schema,
        execute,
        subscribe,
      },
      {
        server,
        path,
      }
    );
  },
  middleware: ({csp}) => (ctx: Context, next) => {
    if (ctx.element) {
      setCspOverrides(csp, ctx);
    }
    return next();
  },
});
