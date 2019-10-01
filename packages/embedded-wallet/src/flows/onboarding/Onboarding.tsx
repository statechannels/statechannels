import React from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';
import {BudgetAllocation, ConnectToHub, NoHub} from '../../dialogs';

export enum OnboardingFlowPaths {
  BudgetAllocation = '/',
  NoHub = '/no-hub',
  ConnectToHub = '/connect'
}

const OnboardingFlow: React.FC = () => {
  return (
    <Router>
      <Route exact path={OnboardingFlowPaths.BudgetAllocation} component={BudgetAllocation} />
      <Route path={OnboardingFlowPaths.NoHub} component={NoHub} />
      <Route path={OnboardingFlowPaths.ConnectToHub} component={ConnectToHub} />
    </Router>
  );
};

export {OnboardingFlow};
