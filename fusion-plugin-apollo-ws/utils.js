// @flow

const protocol = __DEV__ ? 'ws' : 'wss';

type WebSocketURLArgs = {
  host: string,
  pathname?: string,
};

export function getWebSocketURL({host, pathname = ''}: WebSocketURLArgs) {
  return `${protocol}://${host}/${pathname.replace(/^\//, '')}`;
}
