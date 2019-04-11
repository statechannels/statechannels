import { challengingReducer } from '../reducer';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as states from '../../state';
import * as actions from '../../../actions';
import {
  itSendsATransaction,
  itTransitionsToChannelStateType,
  itDoesntTransition,
  itSendsThisMessage,
  itSendsThisDisplayEventType,
} from '../../../__tests__/helpers';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import { hideWallet, challengeComplete } from 'magmo-wallet-client';
import { WalletProcedure } from '../../../types';

const {
  asPrivateKey,
  participants,
  channelId,
  channelNonce,
  libraryAddress,
  gameCommitment1,
  gameCommitment2,
  fundingState,
  mockTransactionOutboxItem,
} = scenarios;

const defaults = {
  uid: 'uid',
  participants,
  libraryAddress,
  channelId,
  channelNonce,
  lastCommitment: { commitment: gameCommitment1, signature: 'sig' },
  penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
  turnNum: gameCommitment2.turnNum,
  adjudicator: 'adj-address',
  ourIndex: 0,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 2323,
  challengeExpiry: 1,
  transactionHash: '0x0',
  fundingState,
  funded: true,
};

const processId = 'procedure-id';

describe('when in APPROVE_CHALLENGE', () => {
  const state = states.approveChallenge({ ...defaults });
  describe('when a challenge is approved', () => {
    const createChallengeTxMock = jest.fn().mockReturnValue(mockTransactionOutboxItem);
    Object.defineProperty(TransactionGenerator, 'createForceMoveTransaction', {
      value: createChallengeTxMock,
    });
    const action = actions.channel.challengeApproved();
    const updatedState = challengingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CHALLENGE_INITIATION, updatedState);
    itSendsATransaction(updatedState);
  });

  describe('when a challenge is declined', () => {
    const action = actions.channel.challengeRejected();
    const updatedState = challengingReducer(state, action);
    itSendsThisDisplayEventType(updatedState, hideWallet().type);
    itSendsThisMessage(updatedState, challengeComplete().type);
    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
  });
});

describe('when in INITIATE_CHALLENGE', () => {
  const state = states.waitForChallengeInitiation(defaults);

  describe('when a challenge is initiated', () => {
    const action = actions.transactionSentToMetamask(channelId, WalletProcedure.Challenging);
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_CHALLENGE_SUBMISSION, updatedState);
  });
});

describe('when in WAIT_FOR_CHALLENGE_SUBMISSION', () => {
  const state = states.waitForChallengeSubmission(defaults);

  describe('when a challenge is submitted', () => {
    const action = actions.transactionSubmitted(channelId, WalletProcedure.Challenging, '0x0');
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_CHALLENGE_CONFIRMATION, updatedState);
  });

  describe('when a challenge submissions fails', () => {
    const action = actions.transactionSubmissionFailed(channelId, WalletProcedure.Challenging, {
      code: 0,
    });
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.CHALLENGE_TRANSACTION_FAILED, updatedState);
  });
});

describe('when in CHALLENGE_TRANSACTION_FAILED', () => {
  const state = states.challengeTransactionFailed(defaults);
  describe('when the transaction is retried', () => {
    const createChallengeTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createForceMoveTransaction', {
      value: createChallengeTxMock,
    });
    const action = actions.retryTransaction(channelId, WalletProcedure.Challenging);
    const updatedState = challengingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CHALLENGE_INITIATION, updatedState);
    expect(createChallengeTxMock.mock.calls.length).toBe(1);
  });
});

describe('when in WAIT_FOR_CHALLENGE_CONFIRMATION', () => {
  const state = states.waitForChallengeConfirmation({ ...defaults });

  describe('when a challenge is confirmed', () => {
    const action = actions.transactionConfirmed(channelId, processId, 'transactionHash');
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_RESPONSE_OR_TIMEOUT, updatedState);
  });
});

describe('when in WAIT_FOR_RESPONSE_OR_TIMEOUT', () => {
  const state = states.waitForResponseOrTimeout({
    ...defaults,
    challengeExpiry: 1,
    moveSelected: false,
  });

  describe('when the opponent responds', () => {
    const action = actions.respondWithMoveEvent('0x0', '0x0', '0xC1');
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_CHALLENGE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.blockMined({ timestamp: 2, number: 2 });
    const updatedState = challengingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = challengingReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in ACKNOWLEDGE_RESPONSE', () => {
  const state = states.acknowledgeChallengeResponse({ ...defaults });
  const action = actions.channel.challengeResponseAcknowledged();
  const updatedState = challengingReducer(state, action);

  itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
});

describe('when in ACKNOWLEDGE_TIMEOUT', () => {
  const state = states.acknowledgeChallengeTimeout({ ...defaults });
  const action = actions.channel.challengedTimedOutAcknowledged();
  const updatedState = challengingReducer(state, action);

  itTransitionsToChannelStateType(states.APPROVE_WITHDRAWAL, updatedState);
});
