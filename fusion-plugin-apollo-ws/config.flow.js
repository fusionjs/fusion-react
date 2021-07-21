// @flow

type Callback = () => {};
type thisContext = any;
type WebSocketClient = any;
type WebSocketServer = any;
export type SubscribeMessage = Object;
export type SubscriptionOptions = Object;
export type ConnectionContext = any;
export type ConnectionParams = Object;
export type ApolloWebSocketConfig = {
  endpoint?: string,
  server?: {
    options: {
      onOperation?: (
        message: SubscribeMessage,
        params: SubscriptionOptions,
        webSocket: WebSocket
      ) => {},
      onOperationComplete?: (webSocket: WebSocket, opId: string) => {},
      onConnect?: (
        connectionParams: ConnectionParams,
        webSocket: WebSocket,
        context: ConnectionContext
      ) => {},
      onDisconnect?: (webSocket: WebSocket, context: ConnectionContext) => {},
      keepAlive?: number,
    },
    socketServer?: WebSocketServer,
  },
  client?: {
    options?: {
      timeout?: number,
      lazy?: boolean,
      connectionParams?:
        | ConnectionParams
        | (() =>
            | (Promise<ConnectionParams> | ConnectionParams)
            | Promise<ConnectionParams>),
      reconnect?: boolean,
      reconnectionAttempts?: number,
      connectionCallback?: (error: Error[], result?: any) => {},
      inactivityTimeout?: number,
    },
    on?: {
      connected?: Callback | [Callback, thisContext],
      reconnected?: Callback | [Callback, thisContext],
      connecting?: Callback | [Callback, thisContext],
      reconnecting?: Callback | [Callback, thisContext],
      disconnected?: Callback | [Callback, thisContext],
      error?: Callback | [Callback, thisContext],
    },
    webSocketImpl?: WebSocketClient,
    webSocketProtocols?: string | string[],
  },
};
