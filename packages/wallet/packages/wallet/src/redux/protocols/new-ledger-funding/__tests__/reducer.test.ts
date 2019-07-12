import * as scenarios from './scenarios';
import { newLedgerFundingReducer, initialize } from '../reducer';
import { ProtocolStateWithSharedData } from '../..';
import { NewLedgerFundingState } from '../states';

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
    const {
      channelId,
      store,
      processId,
      targetAllocation,
      targetDestination,
    } = scenario.initialParams;
    const initialState = initialize(
      processId,
      channelId,
      targetAllocation,
      targetDestination,
      store,
    );

    itTransitionsTo(initialState, 'NewLedgerFunding.WaitForPreFundSetup');
    itSendsAMessage(initialState);
  });

  describeScenarioStep(scenario.waitForPreFundL1, () => {
    const { state, action, sharedData } = scenario.waitForPreFundL1;
    const updatedState = newLedgerFundingReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.WaitForDirectFunding');
  });

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action, sharedData } = scenario.waitForDirectFunding;
    const updatedState = newLedgerFundingReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFund1, () => {
    const { state, action, sharedData } = scenario.waitForPostFund1;
    const updatedState = newLedgerFundingReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.WaitForLedgerUpdate');
  });

  describeScenarioStep(scenario.waitForLedgerUpdate1, () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate1;
    const updatedState = newLedgerFundingReducer(state, sharedData, action);
    itUpdatesFundingState(
      updatedState,
      scenario.initialParams.channelId,
      scenario.initialParams.ledgerId,
    );
    itUpdatesFundingState(updatedState, scenario.initialParams.ledgerId);
    itTransitionsTo(updatedState, 'NewLedgerFunding.Success');
  });
});

describe('ledger-funding-fails scenario', () => {
  const scenario = scenarios.ledgerFundingFails;

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const { state, action, sharedData } = scenario.waitForDirectFunding;
    const updatedState = newLedgerFundingReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'NewLedgerFunding.Failure');
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<NewLedgerFundingState>;

function itTransitionsTo(state: ReturnVal, type: NewLedgerFundingState['type']) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function itUpdatesFundingState(state: ReturnVal, channelId: string, fundingChannelId?: string) {
  it(`Updates the funding state to reflect ${channelId} funded by ${fundingChannelId}`, () => {
    if (!state.sharedData.fundingState[channelId]) {
      fail(`No entry for ${channelId} in fundingState`);
    } else {
      if (!fundingChannelId) {
        expect(state.sharedData.fundingState[channelId].directlyFunded).toBeTruthy();
      } else {
        expect(state.sharedData.fundingState[channelId].directlyFunded).toBeFalsy();
        expect(state.sharedData.fundingState[channelId].fundingChannel).toEqual(fundingChannelId);
      }
    }
  });
}
