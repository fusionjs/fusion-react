/* @flow */

import tape from 'tape-cup';
import React from 'react';
import {createPlugin, createToken} from 'fusion-core';
import {getSimulator} from 'fusion-test-utils';
import App, {withServices} from '../index';

tape.only('inject services', async t => {
  console.log('hi');

  const TestToken = createToken('test');
  const TestPlugin = createPlugin({
    provides() {
      return 'world';
    },
  });

  function TestComponent({hello}) {
    t.equal(hello, 'world');
    return <div>{hello}</div>;
  }

  const TestComponentContainer = withServices(TestComponent, {
    hello: TestToken,
  });

  const element = React.createElement(TestComponentContainer);
  const app = new App(element);

  app.register(TestToken, TestPlugin);

  const sim = getSimulator(app);
  const ctx = await sim.render('/');

  t.ok(typeof ctx.body === 'string' && ctx.body.includes('world'));
  t.end();
});
