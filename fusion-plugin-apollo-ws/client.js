// @flow

/* eslint-disable no-console */
import {createPlugin} from 'fusion-core';
import {GraphQLEndpointToken} from 'fusion-plugin-apollo';
import {WebSocketLink} from 'apollo-link-ws';
// import {type NextLink} from 'apollo-link';
import {ApolloWebSocketConfigToken} from './tokens';
import {SubscriptionClient} from 'subscriptions-transport-ws';
import {getWebSocketURL} from './utils';

type Deps = {
  defaultPath: typeof GraphQLEndpointToken.optional,
  config: typeof ApolloWebSocketConfigToken.optional,
};
export default createPlugin<Deps, typeof WebSocketLink>({
  deps: {
    defaultPath: GraphQLEndpointToken.optional,
    config: ApolloWebSocketConfigToken.optional,
  },
  provides: ({
    defaultPath = '/graphql',
    config: {endpoint: pathname = defaultPath, client: clientConfig = {}} = {},
  }) => {
    const {
      on = {},
      options = {},
      webSocketImpl,
      webSocketProtocols,
    } = clientConfig;
    const uri = getWebSocketURL({host: location.host, pathname});
    const wsClient = new SubscriptionClient(
      uri,
      {
        ...options,
        lazy: true,
      },
      ...(webSocketImpl ? [webSocketImpl] : []),
      ...(webSocketImpl && webSocketProtocols ? [webSocketProtocols] : [])
    );
    Object.entries(on).forEach(([eventName, value]) => {
      const [callback, thisContext] = value instanceof Array ? value : [value];
      wsClient.on(eventName, callback, thisContext);
    });

    /*
      ToDo: upgrade and remove this hack when fixed
      https://github.com/apollographql/subscriptions-transport-ws/issues/377
    */
    wsClient.maxConnectTimeGenerator.setMin(
      wsClient.maxConnectTimeGenerator.max
    );
    wsClient.lazy = !!options.lazy;
    wsClient.connect();
    /* end hackey code */

    return new WebSocketLink(wsClient);
  },
});
