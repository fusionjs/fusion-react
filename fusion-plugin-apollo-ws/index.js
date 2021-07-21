// @flow

import ClientPlugin from './client';
import ServerPlugin from './server';

export * from './config.flow';
export {ApolloWebSocketToken, ApolloWebSocketConfigToken} from './tokens';
export default __NODE__ ? ServerPlugin : ClientPlugin;
