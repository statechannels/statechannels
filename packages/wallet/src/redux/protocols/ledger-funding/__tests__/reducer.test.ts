import * as scenarios from './scenarios';
import { initialize, ledgerFundingReducer } from '../reducer';
import { LedgerFundingState, LedgerFundingStateType } from '../states';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('existing ledger funding happy path', () => {
  const scenario = scenarios.existingLedgerFundingHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result.protocolState, 'LedgerFunding.WaitForExistingLedgerFunding');
  });
});

describe('new ledger funding happy path', () => {
  const scenario = scenarios.newLedgerChannelHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result.protocolState, 'LedgerFunding.WaitForNewLedgerChannel');
  });

  describeScenarioStep(scenario.waitForNewLedgerChannel, () => {
    const { state, sharedData, action } = scenario.waitForNewLedgerChannel;
    const result = ledgerFundingReducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'LedgerFunding.WaitForExistingLedgerFunding');
  });

  describeScenarioStep(scenario.waitForExistingLedgerFunding, () => {
    const { state, sharedData, action } = scenario.waitForExistingLedgerFunding;
    const result = ledgerFundingReducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'LedgerFunding.Success');
  });
});

function itTransitionsTo(protocolState: LedgerFundingState, type: LedgerFundingStateType) {
  it(`transitions to ${type}`, () => {
    expect(protocolState.type).toEqual(type);
  });
}
