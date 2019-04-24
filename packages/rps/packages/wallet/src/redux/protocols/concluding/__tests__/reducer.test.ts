import * as scenarios from './scenarios';
import { concludingReducer, initialize, ReturnVal } from '../reducer';
import { ConcludingStateType, FailureReason } from '../states';

describe('[ Happy path ] scenario', () => {
  const scenario = scenarios.happyPath;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'ApproveConcluding');
  });
  describe('when in ApproveConcluding', () => {
    const state = scenario.states.approveConcluding;
    const action = scenario.actions.concludeSent;
    const result = concludingReducer(state, storage, action);
    // TODO check that the conclude has actually been sent
    itTransitionsTo(result, 'WaitForOpponentConclude');
  });

  describe('when in WaitForOpponentConclude', () => {
    const state = scenario.states.waitForOpponentConclude;
    const action = scenario.actions.concludeReceived;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeChannelConcluded');
  });

  describe('when in AcknowledgeChannelConcluded', () => {
    const state = scenario.states.acknowledgeChannelConcluded;
    const action = scenario.actions.defundChosen;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'WaitForDefund');
  });

  describe('when in WaitForDefund', () => {
    const state = scenario.states.waitForDefund;
    const action = scenario.actions.defunded;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'Success');
  });
});

describe('[ Channel doesnt exist ] scenario', () => {
  const scenario = scenarios.channelDoesntExist;
  const { processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize('NotInitializedChannelId', processId, storage);

    itTransitionsTo(result, 'AcknowledgeChannelDoesntExist');
  });

  describe('when in AcknowledgeChannelDoesntExist', () => {
    const state = scenario.states.acknowledgeChannelDoesntExist;
    const action = scenario.actions.acknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
  });
});

describe('[ Concluding Not Possible ] scenario', () => {
  const scenario = scenarios.concludingNotPossible;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'AcknowledgeConcludingImpossible');
  });

  describe('when in AcknowledgeConcludingImpossible', () => {
    const state = scenario.states.acknowledgeConcludingImpossible;
    const action = scenario.actions.concludingImpossibleAcknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'NotYourTurn');
  });
});

describe('[ Concluding Cancelled ] scenario', () => {
  const scenario = scenarios.concludingCancelled;
  const { storage } = scenario;

  describe('when in ApproveConcluding', () => {
    const state = scenario.states.approveConcluding;
    const action = scenario.actions.cancelled;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'ConcludeCancelled');
  });
});

describe('[ Defunding Failed ] scenario', () => {
  const scenario = scenarios.defundingFailed;
  const { storage } = scenario;

  describe('when in WaitForDefund', () => {
    const state = scenario.states.waitForDefund;
    const action = scenario.actions.defundFailed;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeDefundFailed');
  });

  describe('when inAcknowledgeDefundFailed', () => {
    const state = scenario.states.acknowledgeDefundFailed;
    const action = scenario.actions.acknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'DefundFailed');
  });
});

function itTransitionsTo(result: ReturnVal, type: ConcludingStateType) {
  it(`transitions to ${type}`, () => {
    expect(result.state.type).toEqual(type);
  });
}

function itTransitionsToFailure(result: ReturnVal, reason: FailureReason) {
  it(`transitions to Failure with reason ${reason}`, () => {
    expect(result.state.type).toEqual('Failure');
    if (result.state.type === 'Failure') {
      expect(result.state.reason).toEqual(reason);
    }
  });
}
