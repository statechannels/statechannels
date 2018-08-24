import { Route, Redirect } from 'react-router-dom';
import React from 'react';

const PrivateRoute = ({ isAuthenticated, component: Component, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      return isAuthenticated ? (
        <Component {...props} />
      ) : (
        <Redirect
          to={{
            pathname: '/',
            state: { from: props.location },
          }}
        />
      );
    }}
  />
);

export default PrivateRoute;
