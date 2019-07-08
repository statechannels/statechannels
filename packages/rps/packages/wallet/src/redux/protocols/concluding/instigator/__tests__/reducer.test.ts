import * as scenarios from './scenarios';
import { instigatorConcludingReducer, initialize, ReturnVal } from '../reducer';
import { InstigatorConcludingStateType } from '../states';
import { FailureReason } from '../../states';
import { SharedData } from '../../../../state';
import { Commitment } from '../../../../../domain';
import {
  itSendsThisCommitment,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
  expectThisMessage,
} from '../../../../__tests__/helpers';
import { HIDE_WALLET, CONCLUDE_SUCCESS, CONCLUDE_FAILURE } from 'magmo-wallet-client';

describe('[ Happy path ]', () => {
  const scenario = scenarios.happyPath;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { sharedData } = scenario.initialize;
    const result = initialize(channelId, processId, sharedData);
    itTransitionsTo(result, 'ConcludingInstigator.ApproveConcluding');
  });
  describeScenarioStep(scenario.approveConcluding, () => {
    const { state, action, sharedData, reply } = scenario.approveConcluding;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itSendsConcludeInstigated(result.sharedData, reply);
    itSendsThisMessage(result.sharedData, CONCLUDE_SUCCESS, 1);
    itTransitionsTo(result, 'ConcludingInstigator.WaitForOpponentConclude');
  });

  describeScenarioStep(scenario.waitForOpponentConclude, () => {
    const { state, action, sharedData } = scenario.waitForOpponentConclude;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingInstigator.AcknowledgeConcludeReceived');
  });

  describeScenarioStep(scenario.acknowledgeConcludeReceived, () => {
    const { state, action, sharedData } = scenario.acknowledgeConcludeReceived;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Concluding.Success');
  });
});

describe('[ No Defunding Happy path ]', () => {
  const scenario = scenarios.noDefundingHappyPath;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { sharedData } = scenario.initialize;
    const result = initialize(channelId, processId, sharedData);
    itTransitionsTo(result, 'ConcludingInstigator.ApproveConcluding');
  });
  describeScenarioStep(scenario.approveConcluding, () => {
    const { state, action, sharedData, reply } = scenario.approveConcluding;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itSendsConcludeInstigated(result.sharedData, reply);
    itTransitionsTo(result, 'ConcludingInstigator.WaitForOpponentConclude');
  });

  describeScenarioStep(scenario.waitforOpponentConclude, () => {
    const { state, action, sharedData } = scenario.waitforOpponentConclude;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingInstigator.AcknowledgeConcludeReceived');
  });

  describeScenarioStep(scenario.acknowledgeConcludeReceived, () => {
    const { state, action, sharedData } = scenario.acknowledgeConcludeReceived;
    const result = instigatorConcludingReducer(state, sharedData, action);
    expectThisMessage(result.sharedData, 'WALLET.CONCLUDING.KEEP_LEDGER_CHANNEL_APPROVED');
    itTransitionsTo(result, 'ConcludingInstigator.WaitForOpponentSelection');
  });
  describeScenarioStep(scenario.waitForOpponentResponse, () => {
    const { state, action, sharedData } = scenario.waitForOpponentResponse;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingInstigator.WaitForLedgerUpdate');
  });

  describeScenarioStep(scenario.waitForLedgerUpdate, () => {
    const { state, action, sharedData } = scenario.waitForLedgerUpdate;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'ConcludingInstigator.AcknowledgeSuccess');
  });

  describeScenarioStep(scenario.acknowledgeSuccess, () => {
    const { state, action, sharedData } = scenario.acknowledgeSuccess;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Concluding.Success');
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Channel doesnt exist ]', () => {
  const scenario = scenarios.channelDoesntExist;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { sharedData } = scenario.initialize;
    const result = initialize(channelId, processId, sharedData);

    itTransitionsToAcknowledgeFailure(result, 'ChannelDoesntExist');
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const { state, action, sharedData } = scenario.acknowledgeFailure;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsToFailure(result, 'ChannelDoesntExist');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Not Possible ]', () => {
  const scenario = scenarios.concludingNotPossible;
  const { channelId, processId } = scenario;

  describe('when initializing', () => {
    const { sharedData } = scenario.initialize;
    const result = initialize(channelId, processId, sharedData);

    itTransitionsToAcknowledgeFailure(result, 'NotYourTurn');
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const { state, action, sharedData } = scenario.acknowledgeFailure;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsToFailure(result, 'NotYourTurn');
    itSendsThisMessage(result.sharedData, CONCLUDE_FAILURE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('[ Concluding Cancelled ]', () => {
  const scenario = scenarios.concludingCancelled;

  describeScenarioStep(scenario.approveConcluding, () => {
    const { state, action, sharedData } = scenario.approveConcluding;
    const result = instigatorConcludingReducer(state, sharedData, action);

    itTransitionsToFailure(result, 'ConcludeCancelled');
    itSendsThisDisplayEventType(result, HIDE_WALLET);
  });
});

/////////////
// Helpers //
/////////////

function itSendsConcludeInstigated(sharedData: SharedData, commitment: Commitment) {
  itSendsThisCommitment(sharedData, commitment, 'WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED');
}

function itTransitionsTo(result: ReturnVal, type: InstigatorConcludingStateType) {
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
    expect(result.protocolState.type).toEqual('ConcludingInstigator.AcknowledgeFailure');
    if (result.protocolState.type === 'ConcludingInstigator.AcknowledgeFailure') {
      expect(result.protocolState.reason).toEqual(reason);
    }
  });
}
