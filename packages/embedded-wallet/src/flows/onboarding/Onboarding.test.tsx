import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {History} from 'history';
import React from 'react';
import {RouteComponentProps, Router} from 'react-router';
import {JsonRPCRequest} from 'web3/providers';
import {BudgetAllocation, ConnectToHub, NoHub} from '../../dialogs';
import {FlowRouter, FlowRouterProps} from '../../flow-router/FlowRouter';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import * as Onboarding from './Onboarding';
import {OnboardingFlow, OnboardingFlowPaths} from './Onboarding';

Enzyme.configure({adapter: new Adapter()});

const mockRequest: JsonRPCRequest = {
  jsonrpc: '2.0',
  id: 123,
  method: 'chan_allocate',
  params: ['foo', true, 3]
};

type MockFlow = {
  flowWrapper: ReactWrapper;
  flowContext: jest.SpyInstance<JsonRpcComponentProps>;
  flowRouter: ReactWrapper<FlowRouterProps>;
  budgetAllocationComponent: ReactWrapper<RouteComponentProps>;
  noHubComponent: ReactWrapper<RouteComponentProps>;
  connectToHubComponent: ReactWrapper<RouteComponentProps>;
  history: History;
};

const mockFlow = (): MockFlow => {
  const flow = mount(<OnboardingFlow request={mockRequest} />);

  return refreshFlowFrom(flow);
};

const refreshFlowFrom = (flowWrapper: ReactWrapper): MockFlow => {
  flowWrapper.update();

  const flowContext = jest
    .spyOn(Onboarding, 'useOnboardingFlowContext')
    .mockImplementation(() => ({request: mockRequest}));

  return {
    flowWrapper,
    flowContext,
    flowRouter: flowWrapper.find(FlowRouter),
    budgetAllocationComponent: flowWrapper.find(BudgetAllocation),
    noHubComponent: flowWrapper.find(NoHub),
    connectToHubComponent: flowWrapper.find(ConnectToHub),
    history: flowWrapper.find(Router).prop('history')
  };
};

describe('Onboarding Flow', () => {
  let flow: MockFlow;

  beforeEach(() => {
    flow = mockFlow();
  });

  it('should expose a FlowRouter with the /onboarding/allocate URL as initial path', () => {
    const {flowRouter} = flow;
    expect(flowRouter.exists()).toEqual(true);
    expect(flowRouter.prop('initialPath')).toEqual(OnboardingFlowPaths.BudgetAllocation);
  });

  it('should start the flow with the BudgetAllocation dialog on /onboarding/allocate', () => {
    const {budgetAllocationComponent, history} = flow;
    expect(budgetAllocationComponent.exists()).toEqual(true);
    expect(history.location.pathname).toMatch(OnboardingFlowPaths.BudgetAllocation);
  });

  describe('should mount each component on its proper route, and expose the JsonRpcRequest in the context', () => {
    const routeCases = [
      [OnboardingFlowPaths.BudgetAllocation, true, false, false],
      [OnboardingFlowPaths.NoHub, false, true, false],
      [OnboardingFlowPaths.ConnectToHub, false, false, true]
    ];

    it.each(routeCases)('%s', (path, showsBudgetAllocation, showsNoHub, showsConnectToHub) => {
      const {history, flowWrapper} = flow;

      history.push(path as OnboardingFlowPaths);
      flow = refreshFlowFrom(flowWrapper);

      const {budgetAllocationComponent, noHubComponent, connectToHubComponent, flowContext} = flow;

      expect(flowContext).toHaveBeenCalled();

      expect(budgetAllocationComponent.exists()).toEqual(showsBudgetAllocation);
      expect(noHubComponent.exists()).toEqual(showsNoHub);
      expect(connectToHubComponent.exists()).toEqual(showsConnectToHub);
    });
  });
});
