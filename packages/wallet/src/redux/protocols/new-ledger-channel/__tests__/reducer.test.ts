import * as scenarios from './scenarios';
import { NewLedgerChannelReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../..';
import { NewLedgerChannelState } from '../states';

import { describeScenarioStep, itSendsAMessage } from '../../../__tests__/helpers';
import * as selectors from '../../../selectors';

// Mocks
const getNextNonceMock = jest.fn().mockReturnValue(0);
Object.defineProperty(selectors, 'getNextNonce', {
  value: getNextNonceMock,
});

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  describe('when initializing', () => {
    const initialState = initialize(scenario.initialParams);

    itTransitionsTo(initialState, 'NewLedgerChannel.WaitForPreFundSetup');
    itSendsAMessage(initialState);
  });

  describeScenarioStep(scenario.waitForPreFundL1, () => {
    const { state, action, sharedData } = scenario.waitForPreFundL1;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerChannel.WaitForDirectFunding');
  });

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action, sharedData } = scenario.waitForDirectFunding;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerChannel.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFund1, () => {
    const { state, action, sharedData } = scenario.waitForPostFund1;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerChannel.Success');
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action, sharedData } = scenario.waitForDirectFunding;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerChannel.Failure');
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<NewLedgerChannelState>;

function itTransitionsTo(state: ReturnVal, type: NewLedgerChannelState['type']) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
