/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env browser */
import Enzyme, {mount} from 'enzyme';
import {connect} from 'react-redux';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';

import App from 'fusion-core';
import type {Context} from 'fusion-core';
import {getService} from 'fusion-test-utils';

import GetReduxPlugin from '../browser.js';
import {ReducerToken, PreloadedStateToken, EnhancerToken} from '../tokens.js';

Enzyme.configure({adapter: new Adapter()});

/* Test fixtures */
const appCreator = (reducer, preloadedState, enhancer) => {
  const app = new App('test', el => el);
  if (reducer) {
    app.register(ReducerToken, reducer);
  }
  if (preloadedState) {
    app.register(PreloadedStateToken, preloadedState);
  }
  if (enhancer) {
    app.register(EnhancerToken, enhancer);
  }
  return () => app;
};

test('browser with no preloadedState and no __REDUX_STATE__ element', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  const provider = getService(appCreator(reducer), Redux);
  const {store} = provider && provider.from();
  expect(store.getState()).toStrictEqual({test: 1});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState().test).toBe(2);
});

test('browser with preloadedState and no __REDUX_STATE__ element', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  const preloadedState = {hello: 'world'};
  const {store} = getService(appCreator(reducer, preloadedState), Redux).from();
  expect(store.getState()).toStrictEqual({test: 1, hello: 'world'});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState()).toStrictEqual({test: 2, hello: 'world'});
});

test('browser with no preloadedState and a __REDUX_STATE__ element', () => {
  const Redux = GetReduxPlugin();
  const reduxState = document.createElement('script');
  reduxState.setAttribute('type', 'application/json');
  reduxState.setAttribute('id', '__REDUX_STATE__');
  reduxState.textContent = JSON.stringify({hello: 'world'});
  document.body && document.body.appendChild(reduxState);
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  const {store} = getService(appCreator(reducer), Redux).from();
  expect(store.getState()).toStrictEqual({test: 1, hello: 'world'});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState()).toStrictEqual({test: 2, hello: 'world'});
  document.body && document.body.removeChild(reduxState);
});

test('browser with preloadedState and a __REDUX_STATE__ element', () => {
  const Redux = GetReduxPlugin();
  const reduxState = document.createElement('script');
  reduxState.setAttribute('type', 'application/json');
  reduxState.setAttribute('id', '__REDUX_STATE__');
  reduxState.textContent = JSON.stringify({
    hello: 'unused',
    unused: 'not used',
  });
  document.body && document.body.appendChild(reduxState);
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  const preloadedState = {hello: 'world'};
  const {store} = getService(appCreator(reducer, preloadedState), Redux).from();
  expect(store.getState()).toStrictEqual({test: 1, hello: 'world'});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState()).toStrictEqual({test: 2, hello: 'world'});
  document.body && document.body.removeChild(reduxState);
});

test('browser with enhancer', () => {
  const Redux = GetReduxPlugin();
  const mockCtx = {mock: true};
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  let enhancerCalls = 0;
  const enhancer = createStore => {
    enhancerCalls++;
    expect(typeof createStore).toBe('function');
    return (...args) => {
      expect(args[0]).toBe(reducer);
      const store = createStore(...args);
      // $FlowFixMe
      expect(store.ctx).toBe(mockCtx);
      return store;
    };
  };
  const {store} = getService(appCreator(reducer, null, enhancer), Redux).from(
    ((mockCtx: any): Context)
  );
  if (!store.ctx) {
    return;
  }
  expect(store.ctx).toBe(mockCtx);
  expect(store.getState()).toStrictEqual({test: 1});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState().test).toBe(2);
  expect(enhancerCalls).toBe(1);
});

test('browser with devtools enhancer', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  let enhancerCalls = 0;
  window.__REDUX_DEVTOOLS_EXTENSION__ = () => createStore => {
    enhancerCalls++;
    expect(typeof createStore).toBe('function');
    return (...args) => {
      expect(args[0]).toBe(reducer);
      return createStore(...args);
    };
  };
  const {store} = getService(appCreator(reducer), Redux).from();
  expect(store.getState()).toStrictEqual({test: 1});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState().test).toBe(2);
  expect(enhancerCalls).toBe(1);
  delete window.__REDUX_DEVTOOLS_EXTENSION__;
});

test('browser with devtools enhancer and normal enhancer', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };
  let devtoolsEnhancerCalls = 0;
  let enhancerCalls = 0;
  window.__REDUX_DEVTOOLS_EXTENSION__ = () => createStore => {
    devtoolsEnhancerCalls++;
    expect(typeof createStore).toBe('function');
    return (...args) => {
      expect(args[0]).toBe(reducer);
      return createStore(...args);
    };
  };
  const enhancer = createStore => {
    enhancerCalls++;
    expect(typeof createStore).toBe('function');
    return (...args) => {
      expect(args[0]).toBe(reducer);
      return createStore(...args);
    };
  };
  const {store} = getService(appCreator(reducer, null, enhancer), Redux).from();
  expect(store.getState()).toStrictEqual({test: 1});
  store.dispatch({type: 'CHANGE', payload: 2});
  expect(store.getState().test).toBe(2);
  expect(devtoolsEnhancerCalls).toBe(1);
  expect(enhancerCalls).toBe(1);
  delete window.__REDUX_DEVTOOLS_EXTENSION__;
});

test('browser middleware', async () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => ({
    test: action.payload || 1,
  });
  function Component(props) {
    expect(props.test).toBe(1);
    expect(typeof props.dispatch).toBe('function');
    return React.createElement('div');
  }
  const Connected = connect(state => state)(Component);
  const element = React.createElement(Connected);
  const ctx = {element};
  const Plugin = getService(appCreator(reducer), Redux);
  try {
    await (Redux.middleware &&
      // $FlowFixMe
      Redux.middleware(null, Plugin)((ctx: any), () => Promise.resolve()));
  } catch (e) {
    expect(e).toBeFalsy();
  }
  expect(ctx.element).not.toBe(element);
  const rendered = mount(ctx.element);
  expect(rendered.find(Connected).length).toBe(1);
  expect(rendered.find(Component).length).toBe(1);
  expect(rendered.find(Component).props().test).toBe(1);
  expect(typeof rendered.find(Component).props().dispatch).toBe('function');
});

test('browser - store creation without cleanup between iterations', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };

  function getStore(appCreator, Redux) {
    const provider = getService(appCreator, Redux);
    return provider && provider.from().store;
  }

  const firstStore = getStore(appCreator(reducer), Redux);
  const secondStore = getStore(appCreator(reducer), Redux);

  expect(firstStore).toBe(secondStore);
});

test('browser - store creation with cleanup between iterations', () => {
  const Redux = GetReduxPlugin();
  const reducer = (state, action) => {
    return {
      ...state,
      test: action.payload || 1,
    };
  };

  function getStore(appCreator, Redux) {
    const provider = getService(appCreator, Redux);
    return provider && provider.from().store;
  }

  const firstApp = appCreator(reducer)();
  const firstStore = getStore(() => firstApp, Redux);
  firstApp.cleanup();

  const secondApp = appCreator(reducer)();
  const secondStore = getStore(() => secondApp, Redux);

  expect(firstStore).not.toBe(secondStore);
});
