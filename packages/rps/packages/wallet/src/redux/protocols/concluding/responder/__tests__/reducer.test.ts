import * as scenarios from './scenarios';
import { responderConcludingReducer, initialize, ReturnVal } from '../reducer';
import { ResponderConcludingStateType } from '../states';
import {
  expectThisCommitmentSent,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
  expectThisMessage,
} from '../../../../__tests__/helpers';
import { FailureReason } from '../../states';
import { HIDE_WALLET, CONCLUDE_FAILURE, OPPONENT_CONCLUDED } from 'magmo-wallet-client';

describe('[ Happy path ]', () => {
  const scenario = scenarios.happyPath;
  const { processId } = scenario;

  describe('when initializing', () => {
    const { commitment, sharedData } = scenario.initialize;
    const result = initialize(commitment, processId, sharedData);

    itTransitionsTo(result, 'ConcludingResponder.ApproveConcluding');
    itSendsThisMessage(result.sharedData, OPPONENT_CONCLUDED);
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

    itTransitionsTo(result, 'Concluding.Success');
  });
});

describe('[ Happy path No Defunding]', () => {
  const scenario = scenarios.noDefundingHappyPath;
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

    itTransitionsTo(result, 'ConcludingResponder.WaitForOpponentSelection');
    expectThisMessage(result.sharedData, 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED');
  });

  describeScenarioStep(scenario.waitForOpponentResponse, () => {
    const { state, sharedData, action } = scenario.waitForOpponentResponse;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingResponder.WaitForLedgerUpdate');
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, sharedData, action } = scenario.waitForLedgerUpdate;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingResponder.AcknowledgeSuccess');
  });

  describeScenarioStep(scenario.acknowledgeSuccess, () => {
    const { state, sharedData, action } = scenario.acknowledgeSuccess;
    const result = responderConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Concluding.Success');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
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
