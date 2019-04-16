import { respondingReducer } from '../reducer';

import * as states from '../../state';
import * as actions from '../../../actions';

import { itTransitionsToChannelStateType, itDoesntTransition } from '../../../__tests__/helpers';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import * as SigningUtil from '../../../../utils/signing-utils';
import * as FmgCore from 'fmg-core';
import { WalletProtocol } from '../../../types';

const {
  asPrivateKey,
  participants,
  channelId,
  channelNonce,
  libraryAddress,
  gameCommitment1,
  gameCommitment2,
  gameCommitment3,
  fundingState,
} = scenarios;

const defaults = {
  uid: 'uid',
  participants,
  libraryAddress,
  channelId,
  channelNonce,
  lastCommitment: { commitment: gameCommitment2, signature: 'fake-sig' },
  penultimateCommitment: { commitment: gameCommitment1, signature: 'fake-sig' },
  turnNum: gameCommitment2.turnNum,
  adjudicator: 'adj-address',
  ourIndex: 1,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 2323,
  challengeExpiry: 1,
  moveSelected: false,
  challengeOptions: [],
  transactionHash: '0x0',
  fundingState,
  funded: false,
};

describe('when in CHOOSE_RESPONSE', () => {
  const state = states.chooseResponse(defaults);

  describe('when respond with move is chosen', () => {
    const action = actions.channel.respondWithMoveChosen();
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.TAKE_MOVE_IN_APP, updatedState);
  });

  describe('when respond with refute is chosen', () => {
    const action = actions.channel.respondWithRefuteChosen();
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.INITIATE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = respondingReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in TAKE_MOVE_IN_APP', () => {
  const state = states.takeMoveInApp(defaults);

  describe('when a challenge move is taken in the application', () => {
    const action = actions.channel.challengeCommitmentReceived(gameCommitment3);
    const createRespondTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createRespondWithMoveTransaction', {
      value: createRespondTxMock,
    });
    const toHexMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(FmgCore, 'toHex', { value: toHexMock });
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signCommitment', { value: signMock });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.INITIATE_RESPONSE, updatedState);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = respondingReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in INITIATE_RESPONSE', () => {
  const state = states.initiateResponse(defaults);
  describe('when the challenge response is initiated', () => {
    const action = actions.transactionSent(channelId);
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_RESPONSE_SUBMISSION, updatedState);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });
});

describe('when in WAIT_FOR_RESPONSE_SUBMISSION', () => {
  const state = states.waitForResponseSubmission(defaults);
  describe('when the challenge response is submitted', () => {
    const action = actions.transactionSubmitted(channelId, '0x0');
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_RESPONSE_CONFIRMATION, updatedState);
  });
  describe('when an error occurs when submitting a challenge response', () => {
    const action = actions.transactionSubmissionFailed(channelId, {
      code: 0,
    });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.RESPONSE_TRANSACTION_FAILED, updatedState);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });
});

describe('when in WAIT_FOR_RESPONSE_CONFIRMED', () => {
  const state = states.waitForResponseConfirmation(defaults);
  describe('when the challenge response is confirmed', () => {
    const action = actions.transactionConfirmed(channelId, WalletProtocol.Responding);
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.ACKNOWLEDGE_CHALLENGE_COMPLETE, updatedState);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });
});

describe('when in ACKNOWLEDGE_CHALLENGE_COMPLETE', () => {
  const state = states.acknowledgeChallengeComplete(defaults);
  describe('when the challenge is acknowledged as complete', () => {
    const action = actions.channel.challengeResponseAcknowledged();
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
  });
});

describe('when in RESPONSE_TRANSACTION_FAILED', () => {
  const state = states.responseTransactionFailed(defaults);
  describe('when the transaction is retried', () => {
    const action = actions.transactionRetryApproved(channelId);
    const createRespondTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createRespondWithMoveTransaction', {
      value: createRespondTxMock,
    });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.INITIATE_RESPONSE, updatedState);
    expect(createRespondTxMock.mock.calls.length).toBe(1);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = respondingReducer(state, action);
    itTransitionsToChannelStateType(states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });
});
