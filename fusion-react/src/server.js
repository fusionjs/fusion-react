/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env node */
import * as React from 'react';
import {renderToString} from 'react-dom/server';
import type {Logger} from 'fusion-tokens';
import {UniversalEventsToken} from 'fusion-plugin-universal-events';

type ExtractReturnType = <V>(() => V) => V;
type IEmitter = $Call<ExtractReturnType, typeof UniversalEventsToken>;

export default (el: React.Element<*>, logger?: Logger, emitter?: IEmitter) => {
  try {
    return `<div id='root'>${renderToString(el)}</div>`;
  } catch (e) {
    if (__DEV__) {
      console.error(
        'Server-side render failed. Falling back to client-side render',
        e
      );
    }
    logger && logger.error('SSR Failed with Error', e);
    emitter && emitter.emit('ssr-status', {
      error: e,
      status: 'failure',
    });
    return '<div id="root" data-fusion-render="client"></div>';
  }
};
