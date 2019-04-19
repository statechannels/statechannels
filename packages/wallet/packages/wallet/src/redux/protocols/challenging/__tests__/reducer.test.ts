import * as scenarios from './scenarios';
import { challengingReducer, initialize, ReturnVal } from '../reducer';
import { FailureReason, ChallengingStateType } from '../states';

describe('opponent-responds scenario', () => {
  const scenario = scenarios.opponentResponds;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'ApproveChallenge');
  });
  describe('when in ApproveChallenge', () => {
    const state = scenario.approveChallenge;
    const action = scenario.challengeApproved;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'WaitForTransaction');
    // it initializes the transaction state machine
  });

  describe('when in WaitForTransaction', () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionSuccessTrigger;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'WaitForResponseOrTimeout');
  });

  describe('when in WaitForResponseOrTimeout', () => {
    const state = scenario.waitForResponseOrTimeout;
    const action = scenario.responseReceived;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeResponse');
  });

  describe('when in AcknowledgeResponse', () => {
    const state = scenario.acknowledgeResponse;
    const action = scenario.responseAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'SuccessOpen');
  });
});

describe('challenge-times-out scenario', () => {
  const scenario = scenarios.challengeTimesOut;
  const { storage } = scenario;

  describe('when in WaitForResponseOrTimeout', () => {
    const state = scenario.waitForResponseOrTimeout;
    const action = scenario.challengeTimedOut;
    const result = challengingReducer(state, storage, action);
    itTransitionsTo(result, 'AcknowledgeTimeout');
  });

  describe('when in AcknowledgeTimeout', () => {
    const state = scenario.acknowledgeTimeout;
    const action = scenario.timeoutAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'SuccessClosed');
  });
});

describe("channel-doesn't-exist scenario", () => {
  const scenario = scenarios.channelDoesntExist;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'ChannelDoesntExist');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'ChannelDoesntExist');
  });
});

describe('channel-not-fully-open scenario', () => {
  const scenario = scenarios.channelNotFullyOpen;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'NotFullyOpen');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'NotFullyOpen');
  });
});

describe('already-have-latest-commitment scenario', () => {
  const scenario = scenarios.alreadyHaveLatest;
  const { channelId, processId, storage } = scenario;

  describe('when initializing', () => {
    const result = initialize(channelId, processId, storage);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'AlreadyHaveLatest');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'AlreadyHaveLatest');
  });
});

describe('user-declines-challenge scenario', () => {
  const scenario = scenarios.userDeclinesChallenge;
  const { storage } = scenario;

  describe('when in ApproveChallenge', () => {
    const state = scenario.approveChallenge;
    const action = scenario.challengeDenied;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'DeclinedByUser');
  });
  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'DeclinedByUser');
  });
});

describe('receive-commitment-while-approving scenario', () => {
  const scenario = scenarios.receiveCommitmentWhileApproving;
  const { storage } = scenario;

  describe('when in ApproveChallenge', () => {
    const state = scenario.approveChallenge;
    // note: we're triggering this off the user's acceptance, not the arrival of the update
    const action = scenario.challengeApproved;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'LatestWhileApproving');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'LatestWhileApproving');
  });
});

describe('transaction-fails scenario', () => {
  const scenario = scenarios.transactionFails;
  const { storage } = scenario;

  describe('when in WaitForTransaction', () => {
    const state = scenario.waitForTransaction;
    const action = scenario.transactionFailureTrigger;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'AcknowledgeFailure');
    itHasFailureReason(result, 'TransactionFailed');
  });

  describe('when in AcknowledgeFailure', () => {
    const state = scenario.acknowledgeFailure;
    const action = scenario.failureAcknowledged;
    const result = challengingReducer(state, storage, action);

    itTransitionsTo(result, 'Failure');
    itHasFailureReason(result, 'TransactionFailed');
  });
});

function itTransitionsTo(result: ReturnVal, type: ChallengingStateType) {
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
