import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, Location, MemoryHistory} from 'history';
import React from 'react';
import {match as Match, Router} from 'react-router';
import {OnboardingFlowPaths} from '../../flows';
import {closeWallet} from '../../message-dispatchers';
import {ButtonProps, Dialog, DialogProps, Icons} from '../../ui';
import {NoHub} from './NoHub';

Enzyme.configure({adapter: new Adapter()});

type MockNoHubDialog = {
  dialogWrapper: ReactWrapper;
  routeProps: MockRouteProps;
  dialogElement: ReactWrapper<DialogProps>;
  closeButton: ReactWrapper;
  connectToHubButton: ReactWrapper<ButtonProps>;
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

const mockNoHubDialog = (): MockNoHubDialog => {
  const routeProps = mockRouteProps();
  const dialogWrapper = mount(
    <Router history={routeProps.history}>
      <NoHub {...routeProps} />
    </Router>
  );

  return {
    dialogWrapper,
    routeProps,
    dialogElement: dialogWrapper.find(Dialog),
    closeButton: dialogWrapper.find({onClick: closeWallet}),
    connectToHubButton: dialogWrapper.find({type: 'primary'})
  };
};

describe('Dialogs - NoHub', () => {
  let noHub: MockNoHubDialog;

  beforeEach(() => {
    noHub = mockNoHubDialog();
  });

  it('can be instantiated', () => {
    const {dialogElement, closeButton, connectToHubButton} = noHub;
    expect(dialogElement.exists()).toEqual(true);
    expect(dialogElement.prop('title')).toEqual(
      "You aren't connected to any hubs, so connect to one."
    );
    expect(closeButton.exists()).toEqual(true);
    expect(connectToHubButton.exists()).toEqual(true);
    expect(connectToHubButton.prop('label')).toEqual('Connect to Hub');
    expect(connectToHubButton.prop('icon')).toEqual(Icons.ExternalLink);
    expect(connectToHubButton.prop('iconPosition')).toEqual('right');
  });

  it('should redirect to ConnectToHub when clicking "Connect to Hub"', () => {
    const {connectToHubButton, routeProps} = noHub;
    connectToHubButton.simulate('click');
    expect(routeProps.history.location.pathname).toMatch(OnboardingFlowPaths.ConnectToHub);
  });

  it('should close the wallet when clicking Close', async done => {
    const {closeButton} = noHub;

    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:close') {
        done();
      }
    };

    closeButton.simulate('click');
  });
});
