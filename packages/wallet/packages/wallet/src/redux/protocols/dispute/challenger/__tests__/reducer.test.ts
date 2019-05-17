import * as scenarios from './scenarios';
import { challengerReducer, initialize, ReturnVal } from '../reducer';
import {
  FailureReason,
  ChallengerStateType,
  WaitForTransaction,
  WaitForResponseOrTimeout,
} from '../states';
import {
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  itStoresThisCommitment,
} from '../../../../__tests__/helpers';
import {
  HIDE_WALLET,
  CHALLENGE_COMPLETE,
  CHALLENGE_COMMITMENT_RECEIVED,
  SHOW_WALLET,
} from 'magmo-wallet-client';

describe('OPPONENT RESPONDS', () => {
  const scenario = scenarios.opponentResponds;
  const { channelId, processId, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, sharedData);
    itSendsThisDisplayEventType(result.sharedData, SHOW_WALLET);

    itTransitionsTo(result, 'Challenging.ApproveChallenge');
  });
  describe('when in ApproveChallenge', () => {
    const { state, action } = scenario.approveChallenge;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.WaitForTransaction');
    // it initializes the transaction state machine
  });
  describe('when in WaitForTransaction', () => {
    const { state, action2 } = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action2);

    itTransitionsTo(result, 'Challenging.WaitForTransaction');
    it('updates the expiry time', () => {
      expect((result.state as WaitForTransaction).expiryTime).toEqual(action2.expiryTime);
    });
  });
  describe('when in WaitForTransaction', () => {
    const { state, action } = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.WaitForResponseOrTimeout');
  });

  describe('when in WaitForResponseOrTimeout', () => {
    const { state, action1 } = scenario.waitForResponseOrTimeout;
    const result = challengerReducer(state, sharedData, action1);

    itTransitionsTo(result, 'Challenging.WaitForResponseOrTimeout');
    it('updates the expiry time', () => {
      expect((result.state as WaitForResponseOrTimeout).expiryTime).toEqual(action1.expiryTime);
    });
  });
  describe('when in WaitForResponseOrTimeout', () => {
    const { state, action2, commitment } = scenario.waitForResponseOrTimeout;
    const result = challengerReducer(state, sharedData, action2);

    itSendsThisMessage(result.sharedData, CHALLENGE_COMMITMENT_RECEIVED);
    itStoresThisCommitment(result.sharedData, commitment);
    itTransitionsTo(result, 'Challenging.AcknowledgeResponse');
  });

  describe('when in AcknowledgeResponse', () => {
    const { state, action } = scenario.acknowledgeResponse;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.SuccessOpen');
    itSendsThisMessage(result.sharedData, CHALLENGE_COMPLETE);
    itSendsThisDisplayEventType(result.sharedData, HIDE_WALLET);
  });
});

describe('CHALLENGE TIMES OUT AND IS DEFUNDED ', () => {
  const scenario = scenarios.challengeTimesOutAndIsDefunded;
  const { sharedData } = scenario;

  describe('when in WaitForResponseOrTimeout', () => {
    const { state, action } = scenario.waitForResponseOrTimeout;
    const result = challengerReducer(state, sharedData, action);
    itTransitionsTo(result, 'Challenging.AcknowledgeTimeout');
  });

  describe('when in AcknowledgeTimeout', () => {
    const { state, action } = scenario.acknowledgeTimeout;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.WaitForDefund');
  });

  describe('when in WaitForDefund', () => {
    const { state, action } = scenario.challengerWaitForDefund;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.AcknowledgeSuccess');
  });

  describe('when in Acknowledge Success', () => {
    const { state, action } = scenario.acknowledgeSuccess;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.SuccessClosedAndDefunded');
  });
});

describe('CHALLENGE TIMES OUT AND IS not DEFUNDED ', () => {
  const scenario = scenarios.challengeTimesOutAndIsNotDefunded;
  const { sharedData } = scenario;

  describe('when in WaitForDefund', () => {
    const { state, action } = scenario.challengerWaitForDefund;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.AcknowledgeClosedButNotDefunded');
  });

  describe('when in AcknowledgeSuccessClosedButNotDefunded', () => {
    const { state, action } = scenario.acknowledgeClosedButNotDefunded;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.SuccessClosedButNotDefunded');
  });
});

describe('CHANNEL DOESNT EXIST  ', () => {
  const scenario = scenarios.channelDoesntExist;
  const { channelId, processId, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'ChannelDoesntExist');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'ChannelDoesntExist');
  });
});

describe('CHANNEL NOT FULLY OPEN  ', () => {
  const scenario = scenarios.channelNotFullyOpen;
  const { channelId, processId, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'NotFullyOpen');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'NotFullyOpen');
  });
});

describe('ALREADY HAVE LATEST COMMITMENT', () => {
  const scenario = scenarios.alreadyHaveLatest;
  const { channelId, processId, sharedData } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'AlreadyHaveLatest');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'AlreadyHaveLatest');
  });
});

describe('USER DECLINES CHALLENGE  ', () => {
  const scenario = scenarios.userDeclinesChallenge;
  const { sharedData } = scenario;

  describe('when in ApproveChallenge', () => {
    const { state, action } = scenario.approveChallenge;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'DeclinedByUser');
  });
  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'DeclinedByUser');
  });
});

describe('RECEIVE COMMITMENT WHILE APPROVING  ', () => {
  const scenario = scenarios.receiveCommitmentWhileApproving;
  const { sharedData } = scenario;

  describe('when in ApproveChallenge', () => {
    const { state, action } = scenario.approveChallenge;
    // note: we're triggering this off the user's acceptance, not the arrival of the update
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'LatestWhileApproving');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;

    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'LatestWhileApproving');
  });
});

describe('TRANSACTION FAILS  ', () => {
  const scenario = scenarios.transactionFails;
  const { sharedData } = scenario;

  describe('when in WaitForTransaction', () => {
    const { state, action } = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.AcknowledgeFailure');
    itHasFailureReason(result, 'TransactionFailed');
  });

  describe('when in AcknowledgeFailure', () => {
    const { state, action } = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, 'Challenging.Failure');
    itHasFailureReason(result, 'TransactionFailed');
  });
});

describe('DEFUND ACTION arrives in ACKNOWLEDGE_TIMEOUT', () => {
  const scenario = scenarios.defundActionComesDuringAcknowledgeTimeout;
  const { sharedData } = scenario;
  describe(`when in AcknowledgeTimeout`, () => {
    const state = scenario.acknowledgeTimeout;
    const action = scenario.defundingSuccessTrigger;

    const result = challengerReducer(state, sharedData, action);
    // TODO: Is this the correct state?
    itTransitionsTo(result, 'Challenging.AcknowledgeClosedButNotDefunded');
  });
});

function itTransitionsTo(result: ReturnVal, type: ChallengerStateType) {
  if (!result.state) {
    console.log(result);
  }
  it(`transitions to ${type}`, () => {
    expect(result.state.type).toEqual(type);
  });
}

function itHasFailureReason(result: ReturnVal, reason: FailureReason) {
  it(`has failure reason ${reason}`, () => {
    if ('reason' in result.state) {
      expect(result.state.reason).toEqual(reason);
    } else {
      fail(`State ${result.state.type} doesn't have a failure reason.`);
    }
  });
}
