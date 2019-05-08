import * as scenarios from './scenarios';
import { concludingReducer, initialize, ReturnVal } from '../reducer';
import { ConcludingStateType, FailureReason } from '../states';
import { itSendsThisMessage } from '../../../../__tests__/helpers';
import { sendConcludeChannel } from '../../../../../communication';

describe('[ Happy path ]', () => {
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
    itSendsThisMessage(
      result,
      sendConcludeChannel(
        expect.any(String),
        expect.any(String),
        scenario.commitments.concludeCommitment,
        expect.any(String),
      ),
    );
    itTransitionsTo(result, 'WaitForOpponentConclude');
  });

  describe('when in WaitForOpponentConclude', () => {
    const state = scenario.states.waitForOpponentConclude;
    const action = scenario.actions.concludeReceived;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeConcludeReceived');
  });

  describe('when in AcknowledgeConcludeReceived', () => {
    const state = scenario.states.acknowledgeConcludeReceived;
    const action = scenario.actions.defundChosen;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'WaitForDefund');
  });

  describe('when in WaitForDefund', () => {
    const state = scenario.states.waitForDefund;
    const action = scenario.actions.successTrigger;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeSuccess');
  });

  describe('when in AcknowledgeSuccess', () => {
    const state = scenario.states.acknowledgeSuccess;
    const action = scenario.actions.acknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsTo(result, 'Success');
  });
});

describe('[ Channel doesnt exist ]', () => {
  const scenario = scenarios.channelDoesntExist;
  const { processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize('NotInitializedChannelId', processId, storage);

    itTransitionsToAcknowledgeFailure(result, 'ChannelDoesntExist');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.states.acknowledgeFailure;
    const action = scenario.actions.acknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
  });
});

describe('[ Concluding Not Possible ]', () => {
  const scenario = scenarios.concludingNotPossible;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsToAcknowledgeFailure(result, 'NotYourTurn');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.states.acknowledgeFailure;
    const action = scenario.actions.acknowledged;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'NotYourTurn');
  });
});

describe('[ Concluding Cancelled ]', () => {
  const scenario = scenarios.concludingCancelled;
  const { storage } = scenario;

  describe('when in ApproveConcluding', () => {
    const state = scenario.states.approveConcluding;
    const action = scenario.actions.cancelled;
    const result = concludingReducer(state, storage, action);

    itTransitionsToFailure(result, 'ConcludeCancelled');
  });
});

describe('[ Defunding Failed ]', () => {
  const scenario = scenarios.defundingFailed;
  const { storage } = scenario;

  describe('when in WaitForDefund', () => {
    const state = scenario.states.waitForDefund2;
    const action = scenario.actions.failureTrigger;
    const result = concludingReducer(state, storage, action);

    itTransitionsToAcknowledgeFailure(result, 'DefundFailed');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.states.acknowledgeFailure;
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

function itTransitionsToAcknowledgeFailure(result: ReturnVal, reason: FailureReason) {
  it(`transitions to AcknowledgeFailure with reason ${reason}`, () => {
    expect(result.state.type).toEqual('AcknowledgeFailure');
    if (result.state.type === 'AcknowledgeFailure') {
      expect(result.state.reason).toEqual(reason);
    }
  });
}
