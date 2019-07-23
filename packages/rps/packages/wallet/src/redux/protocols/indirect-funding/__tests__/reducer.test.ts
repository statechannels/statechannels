import * as scenarios from './scenarios';
import { initialize, indirectFundingReducer } from '../reducer';
import { IndirectFundingState, IndirectFundingStateType } from '../states';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('existing ledger funding happy path', () => {
  const scenario = scenarios.existingLedgerFundingHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result.protocolState, 'IndirectFunding.WaitForExistingLedgerFunding');
  });
});

describe('new ledger funding happy path', () => {
  const scenario = scenarios.newLedgerChannelHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result.protocolState, 'IndirectFunding.WaitForNewLedgerChannel');
  });

  describeScenarioStep(scenario.waitForNewLedgerChannel, () => {
    const { state, sharedData, action } = scenario.waitForNewLedgerChannel;
    const result = indirectFundingReducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'IndirectFunding.WaitForExistingLedgerFunding');
  });

  describeScenarioStep(scenario.waitForExistingLedgerFunding, () => {
    const { state, sharedData, action } = scenario.waitForExistingLedgerFunding;
    const result = indirectFundingReducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'IndirectFunding.Success');
  });
});

function itTransitionsTo(protocolState: IndirectFundingState, type: IndirectFundingStateType) {
  it(`transitions to ${type}`, () => {
    expect(protocolState.type).toEqual(type);
  });
}
