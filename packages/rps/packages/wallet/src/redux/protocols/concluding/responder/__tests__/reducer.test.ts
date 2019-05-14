import * as scenarios from './scenarios';
import { responderConcludingReducer, initialize, ReturnVal } from '../reducer';
import { ResponderConcludingStateType } from '../states';
import {
  expectThisCommitmentSent,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
} from '../../../../__tests__/helpers';
import { FailureReason } from '../../state';
import { HIDE_WALLET, CONCLUDE_FAILURE, OPPONENT_CONCLUDED } from 'magmo-wallet-client';
import { SharedData, getLastMessage } from '../../../../state';
import { SignedCommitment } from '../../../../../domain';

describe('[ Happy path ]', () => {
  const scenario = scenarios.happyPath;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, store } = scenario.initialize;
    const result = initialize(commitment, processId, store);

    itTransitionsTo(result, 'ResponderApproveConcluding');
  });
  describe('when in ApproveConcluding', () => {
    const { state, store, action, reply } = scenario.approveConcluding;
    const result = responderConcludingReducer(state, store, action);

    expectThisCommitmentSent(result.sharedData, reply);
    itTransitionsTo(result, 'ResponderDecideDefund');
  });

  describe('when in DecideDefund', () => {
    const { state, store, action } = scenario.decideDefund;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsTo(result, 'ResponderWaitForDefund');
  });

  describe('when in WaitForDefund', () => {
    const { state, store, action } = scenario.waitForDefund;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsTo(result, 'ResponderAcknowledgeSuccess');
  });

  describe('when in AcknowledgeSuccess', () => {
    const { state, store, action } = scenario.acknowledgeSuccess;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsTo(result, 'Success');
    itSendsThisMessage(result.sharedData, OPPONENT_CONCLUDED);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Happy path (alternative) ]', () => {
  const scenario = scenarios.happyPathAlternative;

  describe('when in DecideDefund', () => {
    const { state, store, action, reply } = scenario.decideDefund;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsTo(result, 'ResponderWaitForDefund');
    it(`initializes defundingState`, () => {
      expect(result.protocolState).toHaveProperty('defundingState');
    });

    it(`initializes indirectDefundingState`, () => {
      expect(result.protocolState).toHaveProperty('defundingState.indirectDefundingState');
    });

    it(`transitions indirectDefundingState to WaitForConclude`, () => {
      expect(result.protocolState).toHaveProperty(
        'defundingState.indirectDefundingState.type',
        'WaitForConclude',
      );
    });
    itSendsMessage(result.sharedData, reply);
  });
});

describe('[ Channel doesnt exist ]', () => {
  const scenario = scenarios.channelDoesntExist;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, store } = scenario.initialize;
    const result = initialize(commitment, processId, store);

    itTransitionsToAcknowledgeFailure(result, 'ChannelDoesntExist');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Not Possible ]', () => {
  const scenario = scenarios.concludingNotPossible;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, store } = scenario.initialize;
    const result = initialize(commitment, processId, store);

    itTransitionsToAcknowledgeFailure(result, 'NotYourTurn');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'NotYourTurn');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Defund failed ]', () => {
  const scenario = scenarios.defundFailed;

  describe('when in WaitForDefund', () => {
    const { state, action, store } = scenario.waitForDefund;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsToAcknowledgeFailure(result, 'DefundFailed');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'DefundFailed');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

function itTransitionsTo(result: ReturnVal, type: ResponderConcludingStateType) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}

function itTransitionsToFailure(result: ReturnVal, reason: FailureReason) {
  it(`transitions to Failure with reason ${reason}`, () => {
    expect(result.protocolState.type).toEqual('Failure');
    if (result.protocolState.type === 'Failure') {
      expect(result.protocolState.reason).toEqual(reason);
    }
  });
}

function itTransitionsToAcknowledgeFailure(result: ReturnVal, reason: FailureReason) {
  it(`transitions to AcknowledgeFailure with reason ${reason}`, () => {
    expect(result.protocolState.type).toEqual('ResponderAcknowledgeFailure');
    if (result.protocolState.type === 'ResponderAcknowledgeFailure') {
      expect(result.protocolState.reason).toEqual(reason);
    }
  });
}

function itSendsMessage(sharedData: SharedData, message: SignedCommitment) {
  it('sends a message', () => {
    const lastMessage = getLastMessage(sharedData);
    if (lastMessage && 'messagePayload' in lastMessage) {
      const dataPayload = lastMessage.messagePayload;
      // This is yuk. The data in a message is currently of 'any' type..
      if (!('signedCommitment' in dataPayload)) {
        fail('No signedCommitment in the last message.');
      }
      const { commitment, signature } = dataPayload.signedCommitment;
      expect({ commitment, signature }).toEqual(message);
    } else {
      fail('No messages in the outbox.');
    }
  });
}
