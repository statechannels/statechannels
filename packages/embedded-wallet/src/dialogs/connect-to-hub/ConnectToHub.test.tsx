import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, Location, MemoryHistory} from 'history';
import React from 'react';
import {match as Match, Router} from 'react-router';
import {JsonRPCRequest} from 'web3/providers';
import {OnboardingFlowPaths} from '../../flows';
import * as Onboarding from '../../flows/onboarding/Onboarding';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, DialogProps, FlowStep, FlowStepProps} from '../../ui';
import {ConnectToHub, FlowSteps} from './ConnectToHub';

Enzyme.configure({adapter: new Adapter()});

const mockRequest: JsonRPCRequest = {
  jsonrpc: '2.0',
  id: 123,
  method: 'chan_allocate',
  params: ['foo', true, 3]
};

jest
  .spyOn(Onboarding, 'useOnboardingFlowContext')
  .mockImplementation(() => ({request: mockRequest}));

type MockConnectToHubDialog = {
  dialogWrapper: ReactWrapper;
  routeProps: MockRouteProps;
  dialogElement: ReactWrapper<DialogProps>;
  closeButton: ReactWrapper;
  flowSteps: ReactWrapper<FlowStepProps>;
};

type MockRouteProps = {
  history: MemoryHistory;
  location: Location;
  match: Match;
};

const mockRouteProps = (): MockRouteProps => {
  const history = createMemoryHistory();
  const {location} = history;
  const match = {
    isExact: true,
    params: {},
    path: OnboardingFlowPaths.NoHub,
    url: `http://localhost/${OnboardingFlowPaths.NoHub}`
  };

  return {history, location, match};
};

const mockConnectToHubDialog = (): MockConnectToHubDialog => {
  const routeProps = mockRouteProps();
  const dialogWrapper = mount(
    <Router history={routeProps.history}>
      <ConnectToHub {...routeProps} />
    </Router>
  );

  return refreshConnectToHubDialog(dialogWrapper, routeProps);
};

const refreshConnectToHubDialog = (dialogWrapper: ReactWrapper, routeProps: MockRouteProps) => {
  dialogWrapper.update();

  return {
    dialogWrapper,
    routeProps,
    dialogElement: dialogWrapper.find(Dialog),
    flowSteps: dialogWrapper.find(FlowStep),
    closeButton: dialogWrapper.find({onClick: closeWallet})
  };
};

describe('Dialogs - ConnectToHub', () => {
  let connectToHub: MockConnectToHubDialog;

  beforeEach(() => {
    connectToHub = mockConnectToHubDialog();
  });

  it('can be instantiated', () => {
    const {dialogElement, closeButton, flowSteps} = connectToHub;
    expect(dialogElement.exists()).toEqual(true);
    expect(dialogElement.prop('title')).toEqual('Connect to Hub');
    expect(closeButton.exists()).toEqual(true);
    expect(flowSteps.exists()).toEqual(true);

    flowSteps.forEach((flowStep, index) => {
      expect(flowStep.prop('title')).toEqual(FlowSteps[index].title);
      expect(flowStep.prop('status')).toEqual(FlowSteps[index].status);
    });
  });

  it('should close the wallet when clicking Close', async done => {
    const {closeButton} = connectToHub;

    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:close') {
        done();
      }
    };

    closeButton.simulate('click');
  });
});
