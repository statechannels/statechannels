import * as scenarios from './scenarios';
import { instigatorConcludingReducer, initialize, ReturnVal } from '../reducer';
import { InstigatorConcludingStateType } from '../states';
import { FailureReason } from '../../state';
import { SharedData } from '../../../../state';
import { Commitment } from '../../../../../domain';
import {
  expectThisMessageAndCommitmentSent,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
} from '../../../../__tests__/helpers';
import { HIDE_WALLET, CONCLUDE_SUCCESS, CONCLUDE_FAILURE } from 'magmo-wallet-client';
import { CONCLUDE_INSTIGATED } from '../../../../../communication';

describe('[ Happy path ]', () => {
  const scenario = scenarios.happyPath;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { store } = scenario.initialize;
    const result = initialize(channelId, processId, store);
    itTransitionsTo(result, 'InstigatorApproveConcluding');
  });
  describe('when in ApproveConcluding', () => {
    const { state, action, store, reply } = scenario.approveConcluding;
    const result = instigatorConcludingReducer(state, store, action);

    itSendsConcludeInstigated(result.sharedData, reply);
    itTransitionsTo(result, 'InstigatorWaitForOpponentConclude');
  });

  describe('when in WaitForOpponentConclude', () => {
    const { state, action, store } = scenario.waitforOpponentConclude;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsTo(result, 'InstigatorAcknowledgeConcludeReceived');
  });

  describe('when in AcknowledgeConcludeReceived', () => {
    const { state, action, store } = scenario.acknowledgeConcludeReceived;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsTo(result, 'InstigatorWaitForDefund');
  });

  describe('when in WaitForDefund', () => {
    const { state, action, store } = scenario.waitForDefund;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsTo(result, 'InstigatorAcknowledgeSuccess');
  });

  describe('when in AcknowledgeSuccess', () => {
    const { state, action, store } = scenario.acknowledgeSuccess;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsTo(result, 'Success');
    itSendsThisMessage(result.sharedData, CONCLUDE_SUCCESS);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Channel doesnt exist ]', () => {
  const scenario = scenarios.channelDoesntExist;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { store } = scenario.initialize;
    const result = initialize(channelId, processId, store);

    itTransitionsToAcknowledgeFailure(result, 'ChannelDoesntExist');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Not Possible ]', () => {
  const scenario = scenarios.concludingNotPossible;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { store } = scenario.initialize;
    const result = initialize(channelId, processId, store);

    itTransitionsToAcknowledgeFailure(result, 'NotYourTurn');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'NotYourTurn');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Cancelled ]', () => {
  const scenario = scenarios.concludingCancelled;

  describe('when in ApproveConcluding', () => {
    const { state, action, store } = scenario.approveConcluding;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'ConcludeCancelled');
    itSendsThisDisplayEventType(result, HIDE_WALLET);
  });
});

describe('[ Defund failed ]', () => {
  const scenario = scenarios.defundFailed;

  describe('when in WaitForDefund', () => {
    const { state, action, store } = scenario.waitForDefund;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsToAcknowledgeFailure(result, 'DefundFailed');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action, store } = scenario.acknowledgeFailure;
    const result = instigatorConcludingReducer(state, store, action);

    itTransitionsToFailure(result, 'DefundFailed');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

/////////////
// Helpers //
/////////////

function itSendsConcludeInstigated(sharedData: SharedData, commitment: Commitment) {
  it('sends a conclude instigated message with the correct commitment', () => {
    expectThisMessageAndCommitmentSent(sharedData, commitment, CONCLUDE_INSTIGATED);
  });
}

function itTransitionsTo(result: ReturnVal, type: InstigatorConcludingStateType) {
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
    expect(result.protocolState.type).toEqual('InstigatorAcknowledgeFailure');
    if (result.protocolState.type === 'InstigatorAcknowledgeFailure') {
      expect(result.protocolState.reason).toEqual(reason);
    }
  });
}
