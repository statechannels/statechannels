import * as scenarios from './scenarios';
import { responderConcludingReducer, initialize, ReturnVal } from '../reducer';
import { ResponderConcludingStateType } from '../states';
import {
  expectThisCommitmentSent,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
} from '../../../../__tests__/helpers';
import { FailureReason } from '../../states';
import { HIDE_WALLET, CONCLUDE_FAILURE, OPPONENT_CONCLUDED } from 'magmo-wallet-client';
import { SharedData, getLastMessage } from '../../../../state';
import { SignedCommitment } from '../../../../../domain';

describe('[ Happy path ]', () => {
  const scenario = scenarios.happyPath;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, sharedData } = scenario.initialize;
    const result = initialize(commitment, processId, sharedData);

    itTransitionsTo(result, 'ConcludingResponder.ApproveConcluding');
  });
  describeScenarioStep(scenario.approveConcluding, () => {
    const { state, sharedData, action, reply } = scenario.approveConcluding;
    const result = responderConcludingReducer(state, sharedData, action);

    expectThisCommitmentSent(result.sharedData, reply);
    itTransitionsTo(result, 'ConcludingResponder.DecideDefund');
  });

  describeScenarioStep(scenario.decideDefund, () => {
    const { state, sharedData, action } = scenario.decideDefund;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingResponder.WaitForDefund');
  });

  describeScenarioStep(scenario.waitForDefund, () => {
    const { state, sharedData, action } = scenario.waitForDefund;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingResponder.AcknowledgeSuccess');
  });

  describeScenarioStep(scenario.acknowledgeSuccess, () => {
    const { state, sharedData, action } = scenario.acknowledgeSuccess;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Concluding.Success');
    itSendsThisMessage(result.sharedData, OPPONENT_CONCLUDED);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Happy path (alternative) ]', () => {
  const scenario = scenarios.happyPathAlternative;

  describeScenarioStep(scenario.decideDefund, () => {
    const { state, sharedData, action, reply } = scenario.decideDefund;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingResponder.WaitForDefund');
    it(`initializes defundingState`, () => {
      expect(result.protocolState).toHaveProperty('defundingState');
    });

    it(`initializes indirectDefundingState`, () => {
      expect(result.protocolState).toHaveProperty('defundingState.indirectDefundingState');
    });

    it(`transitions indirectDefundingState to WaitForConclude`, () => {
      expect(result.protocolState).toHaveProperty(
        'defundingState.indirectDefundingState.type',
        'IndirectDefunding.WaitForConclude',
      );
    });
    itSendsMessage(result.sharedData, reply);
  });
});

describe('[ Channel doesnt exist ]', () => {
  const scenario = scenarios.channelDoesntExist;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, sharedData } = scenario.initialize;
    const result = initialize(commitment, processId, sharedData);

    itTransitionsToAcknowledgeFailure(result, 'ChannelDoesntExist');
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const { state, action, sharedData } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Not Possible ]', () => {
  const scenario = scenarios.concludingNotPossible;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, sharedData } = scenario.initialize;
    const result = initialize(commitment, processId, sharedData);

    itTransitionsToAcknowledgeFailure(result, 'NotYourTurn');
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const { state, action, sharedData } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsToFailure(result, 'NotYourTurn');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Defund failed ]', () => {
  const scenario = scenarios.defundFailed;

  describeScenarioStep(scenario.waitForDefund, () => {
    const { state, action, sharedData } = scenario.waitForDefund;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsToAcknowledgeFailure(result, 'DefundFailed');
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const { state, action, sharedData } = scenario.acknowledgeFailure;
    const result = responderConcludingReducer(state, sharedData, action);

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
    expect(result.protocolState.type).toEqual('Concluding.Failure');
    if (result.protocolState.type === 'Concluding.Failure') {
      expect(result.protocolState.reason).toEqual(reason);
    }
  });
}

function itTransitionsToAcknowledgeFailure(result: ReturnVal, reason: FailureReason) {
  it(`transitions to AcknowledgeFailure with reason ${reason}`, () => {
    expect(result.protocolState.type).toEqual('ConcludingResponder.AcknowledgeFailure');
    if (result.protocolState.type === 'ConcludingResponder.AcknowledgeFailure') {
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
