// @flow
import {createToken} from 'fusion-core';
import type {ApolloWebSocketConfig} from './config.flow';

export const ApolloWebSocketToken = createToken<any>('graphql-websocket');
export const ApolloWebSocketConfigToken = createToken<ApolloWebSocketConfig>(
  'graphql-websocket-config'
);
