import React from 'react';
import PropTypes from 'prop-types';

export default {
  create: name => {
    return Component => {
      class HOC extends React.Component {
        constructor(props, ctx) {
          super(props, ctx);
          this.service = ctx[name];
        }
        render() {
          const props = {...this.props, [name]: this.service};
          return React.createElement(Component, props);
        }
      }
      const displayName = Component.displayName || Component.name;
      HOC.displayName =
        'With' +
        name.replace(/^./, c => c.toUpperCase()) +
        '(' +
        displayName +
        ')';
      HOC.contextTypes = {
        [name]: PropTypes.object.isRequired,
      };
      return HOC;
    };
  },
};
