import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, Location, MemoryHistory} from 'history';
import React from 'react';
import {match as Match, Router} from 'react-router';
import {OnboardingFlowPaths} from '../../flows';
import {closeWallet} from '../../message-dispatchers';
import {ButtonProps, Dialog, DialogProps, Slider, SliderProps} from '../../ui';
import {BudgetAllocation} from './BudgetAllocation';

Enzyme.configure({adapter: new Adapter()});

type MockBudgetAllocationDialog = {
  dialogWrapper: ReactWrapper;
  routeProps: MockRouteProps;
  dialogElement: ReactWrapper<DialogProps>;
  closeButton: ReactWrapper;
  sliderElement: ReactWrapper<SliderProps>;
  allowButton: ReactWrapper<ButtonProps>;
  rejectButton: ReactWrapper<ButtonProps>;
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
    path: OnboardingFlowPaths.BudgetAllocation,
    url: `http://localhost/${OnboardingFlowPaths.BudgetAllocation}`
  };

  return {history, location, match};
};

const mockBudgetAllocationDialog = (): MockBudgetAllocationDialog => {
  const routeProps = mockRouteProps();
  const dialogWrapper = mount(
    <Router history={routeProps.history}>
      <BudgetAllocation {...routeProps} />
    </Router>
  );

  return {
    dialogWrapper,
    routeProps,
    dialogElement: dialogWrapper.find(Dialog),
    closeButton: dialogWrapper.find({onClick: closeWallet}),
    sliderElement: dialogWrapper.find(Slider),
    allowButton: dialogWrapper.find({type: 'primary'}),
    rejectButton: dialogWrapper.find({type: 'secondary'})
  };
};

describe('Dialogs - BudgetAllocation', () => {
  let budgetAllocation: MockBudgetAllocationDialog;

  beforeEach(() => {
    budgetAllocation = mockBudgetAllocationDialog();
  });

  it('can be instantiated', () => {
    const {dialogElement, closeButton, sliderElement, allowButton, rejectButton} = budgetAllocation;
    expect(dialogElement.exists()).toEqual(true);
    expect(dialogElement.prop('title')).toEqual('statechannels.com want to allocate');
    expect(closeButton.exists()).toEqual(true);
    expect(sliderElement.exists()).toEqual(true);
    expect(sliderElement.prop('initialValue')).toEqual(0.2);
    expect(sliderElement.prop('min')).toEqual(0);
    expect(sliderElement.prop('max')).toEqual(2);
    expect(sliderElement.prop('step')).toEqual(0.01);
    expect(sliderElement.prop('unit')).toEqual('ETH');
    expect(allowButton.exists()).toEqual(true);
    expect(allowButton.prop('label')).toEqual('Allow');
    expect(rejectButton.exists()).toEqual(true);
    expect(rejectButton.prop('label')).toEqual('Reject');
  });

  it('should redirect to NoHub when clicking Allow', () => {
    const {allowButton, routeProps} = budgetAllocation;
    allowButton.simulate('click');
    expect(routeProps.history.location.pathname).toMatch(OnboardingFlowPaths.NoHub);
  });

  it('should close the wallet when clicking Close', async done => {
    const {closeButton} = budgetAllocation;

    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:close') {
        done();
      }
    };

    closeButton.simulate('click');
  });

  it('should close the wallet when clicking Reject', async done => {
    const {rejectButton} = budgetAllocation;

    window.onmessage = (event: MessageEvent) => {
      if (event.data === 'ui:wallet:close') {
        done();
      }
    };

    rejectButton.simulate('click');
  });
});
