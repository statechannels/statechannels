import React, {useContext} from 'react';
import {Route} from 'react-router-dom';
import {
  BudgetAllocation as BudgetAllocationDialog,
  ConnectToHub as ConnectToHubDialog,
  NoHub as NoHubDialog,
  OnboardingFinished as OnboardingFinishedDialog
} from '../../dialogs';
import {FlowRouter} from '../../flow-router/FlowRouter';
import {JsonRpcComponentProps} from '../../json-rpc-router';

export enum OnboardingFlowPaths {
  BudgetAllocation = '/onboarding/allocate',
  NoHub = '/onboarding/no-hub',
  ConnectToHub = '/onboarding/connect',
  Finished = '/onboarding/finished'
}

const initialPath = OnboardingFlowPaths.BudgetAllocation;

const OnboardingFlowContext = React.createContext<JsonRpcComponentProps>(
  {} as JsonRpcComponentProps
);

const useOnboardingFlowContext = () => useContext(OnboardingFlowContext);

const OnboardingFlow: React.FC<JsonRpcComponentProps> = ({request}) => (
  <FlowRouter initialPath={initialPath}>
    <OnboardingFlowContext.Provider value={{request}}>
      <Route path={OnboardingFlowPaths.BudgetAllocation} component={BudgetAllocationDialog} />
      <Route path={OnboardingFlowPaths.NoHub} component={NoHubDialog} />
      <Route path={OnboardingFlowPaths.ConnectToHub} component={ConnectToHubDialog} />
      <Route path={OnboardingFlowPaths.Finished} component={OnboardingFinishedDialog} />
    </OnboardingFlowContext.Provider>
  </FlowRouter>
);

export {OnboardingFlow, OnboardingFlowContext, useOnboardingFlowContext};
