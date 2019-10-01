import React from 'react';
import {Route} from 'react-router-dom';
import {BudgetAllocation, ConnectToHub, NoHub} from '../../dialogs';
import {FlowRouter} from '../../flow-router/FlowRouter';
import {JsonRpcComponentProps} from '../../json-rpc-router';

export enum OnboardingFlowPaths {
  BudgetAllocation = '/onboarding/allocate',
  NoHub = '/onboarding/no-hub',
  ConnectToHub = '/onboarding/connect'
}

const initialPath = OnboardingFlowPaths.BudgetAllocation;

const OnboardingFlowContext = React.createContext<JsonRpcComponentProps>(
  {} as JsonRpcComponentProps
);

const OnboardingFlow: React.FC<JsonRpcComponentProps> = ({request}) => {
  return (
    <FlowRouter initialPath={initialPath}>
      <OnboardingFlowContext.Provider value={{request}}>
        <Route path={OnboardingFlowPaths.BudgetAllocation} component={BudgetAllocation} />
        <Route path={OnboardingFlowPaths.NoHub} component={NoHub} />
        <Route path={OnboardingFlowPaths.ConnectToHub} component={ConnectToHub} />
      </OnboardingFlowContext.Provider>
    </FlowRouter>
  );
};

export {OnboardingFlow, OnboardingFlowContext};
