import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, Location, MemoryHistory} from 'history';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {match as Match, Router} from 'react-router';
import {OnboardingFlowPaths} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {mockOnboardingFlowContext} from '../../test-utils';
import {Dialog, DialogProps, FlowStep, FlowStepProps} from '../../ui';
import {ConnectToHub, ConnectToHubProps, FlowSteps} from './ConnectToHub';

Enzyme.configure({adapter: new Adapter()});

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
    path: OnboardingFlowPaths.ConnectToHub,
    url: `http://localhost/${OnboardingFlowPaths.ConnectToHub}`
  };

  return {history, location, match};
};

const mockConnectToHubDialog = (props?: Partial<ConnectToHubProps>): MockConnectToHubDialog => {
  const routeProps = mockRouteProps();
  const dialogWrapper = mount(
    <Router history={routeProps.history}>
      <ConnectToHub {...routeProps} {...props} />
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
  let onboardingFlowContext: jest.SpyInstance<JsonRpcComponentProps, []>;
  let connectToHub: MockConnectToHubDialog;

  beforeEach(() => {
    onboardingFlowContext = mockOnboardingFlowContext();
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

  /**
   * @todo: This test passes but there's a weird act() error. We're not fixing it
   * at the moment because the flow is still a mock (steps are completed with
   * setTimeouts).
   */
  it('should redirect to OnboardingFinished when all steps are completed', async done => {
    act(() => {
      const {routeProps} = mockConnectToHubDialog({
        onStepsDone: () => {
          expect(routeProps.history.location.pathname).toMatch(OnboardingFlowPaths.Finished);
          done();
        }
      });
    });
  });

  afterEach(() => {
    onboardingFlowContext.mockReset();
  });
});
