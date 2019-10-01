import React from 'react';
import {BrowserRouter as Router, Redirect, Switch} from 'react-router-dom';

export type FlowRouterProps = {initialPath: string};

const FlowRouter: React.FC<FlowRouterProps> = ({initialPath, children}) => {
  return (
    <Router>
      <Switch>
        <Redirect exact from="/" to={initialPath} />
        {children}
      </Switch>
    </Router>
  );
};

export {FlowRouter};
