import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, Location, MemoryHistory} from 'history';
import React from 'react';
import {match as Match, Router} from 'react-router';
import {OnboardingFlowPaths} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {mockOnboardingFlowContext} from '../../test-utils';
import {ButtonProps, Dialog, DialogProps} from '../../ui';
import {OnboardingFinished} from './OnboardingFinished';

Enzyme.configure({adapter: new Adapter()});

type MockOnboardingFinishedDialog = {
  dialogWrapper: ReactWrapper;
  routeProps: MockRouteProps;
  dialogElement: ReactWrapper<DialogProps>;
  closeButton: ReactWrapper;
  backToAppButton: ReactWrapper<ButtonProps>;
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
    path: OnboardingFlowPaths.Finished,
    url: `http://localhost/${OnboardingFlowPaths.Finished}`
  };

  return {history, location, match};
};

const mockOnboardingFinishedDialog = (): MockOnboardingFinishedDialog => {
  const routeProps = mockRouteProps();
  const dialogWrapper = mount(
    <Router history={routeProps.history}>
      <OnboardingFinished {...routeProps} />
    </Router>
  );

  return {
    dialogWrapper,
    routeProps,
    dialogElement: dialogWrapper.find(Dialog),
    closeButton: dialogWrapper.find({onClick: closeWallet}),
    backToAppButton: dialogWrapper.find({type: 'primary'})
  };
};

describe('Dialogs - OnboardingFinished', () => {
  let onboardingFlowContext: jest.SpyInstance<JsonRpcComponentProps, []>;
  let onboardingFinishedDialog: MockOnboardingFinishedDialog;

  beforeEach(() => {
    onboardingFlowContext = mockOnboardingFlowContext();
    onboardingFinishedDialog = mockOnboardingFinishedDialog();
  });

  it('can be instantiated', () => {
    const {dialogElement, closeButton, backToAppButton} = onboardingFinishedDialog;
    expect(dialogElement.exists()).toEqual(true);
    expect(dialogElement.prop('title')).toEqual('All set!');
    expect(closeButton.exists()).toEqual(false);
    expect(backToAppButton.exists()).toEqual(true);
    expect(backToAppButton.prop('label')).toEqual('Back to App');
  });

  it('should close the wallet when clicking the primary button', async done => {
    const {backToAppButton} = onboardingFinishedDialog;

    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:close') {
        done();
      }
    };

    backToAppButton.simulate('click');
  });

  afterEach(() => {
    onboardingFlowContext.mockReset();
  });
});
