import * as scenarios from './scenarios';
import { LedgerDefundingState, LedgerDefundingStateType } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { initialize, ledgerDefundingReducer } from '../reducer';

describe('Cleared To Send happy path', () => {
  const scenario = scenarios.clearedToSendHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialParams);
    itTransitionsTo(result, 'LedgerDefunding.WaitForLedgerUpdate');
  });

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = ledgerDefundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'LedgerDefunding.Success');
  });
});

type ReturnVal = ProtocolStateWithSharedData<LedgerDefundingState>;
function itTransitionsTo(state: ReturnVal, type: LedgerDefundingStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
