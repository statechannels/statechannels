import * as scenarios from './scenarios';
import { IndirectDefundingState, IndirectDefundingStateType } from '../states';
import { ProtocolStateWithSharedData } from '../..';
import { initialize, indirectDefundingReducer } from '../reducer';

describe('Cleared To Send happy path', () => {
  const scenario = scenarios.clearedToSendHappyPath;

  describe('when initializing', () => {
    const result = initialize(scenario.initialParams);
    itTransitionsTo(result, 'IndirectDefunding.WaitForLedgerUpdate');
  });

  describe('when in WaitForLedgerUpdate', () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const updatedState = indirectDefundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.WaitForConclude');
  });
  describe('when in WaitForConclude', () => {
    const { state, action, sharedData } = scenario.waitForConclude;
    const updatedState = indirectDefundingReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'IndirectDefunding.Success');
  });
});

type ReturnVal = ProtocolStateWithSharedData<IndirectDefundingState>;
function itTransitionsTo(state: ReturnVal, type: IndirectDefundingStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
