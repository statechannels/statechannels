import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';

import { itTransitionsToStateType, itDoesntTransition } from './helpers';
import * as scenarios from './test-scenarios';
import * as TransactionGenerator from '../../../utils/transaction-generator';

const {
  asPrivateKey,
  revealHex,
  acceptHex,
  participants,
  channelId,
  channelNonce,
  libraryAddress,
} = scenarios.standard;

const defaults = {
  uid: 'uid',
  participants,
  libraryAddress,
  channelId,
  channelNonce,
  lastPosition: { data: revealHex, signature: 'fake-sig' },
  penultimatePosition: { data: acceptHex, signature: 'fake-sig' },
  turnNum: 6,
  adjudicator: 'adj-address',
  ourIndex: 1,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 2323,
  challengeExpiry: 1,
  moveSelected: false,
  challengeOptions: [],
  transactionHash: '0x0',
};

describe('when in ACKNOWLEDGE_CHALLENGE', () => {
  const state = states.acknowledgeChallenge(defaults);

  describe('when a challenge is acknowledged', () => {
    const action = actions.challengeAcknowledged();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.CHOOSE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = walletReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in CHOOSE_RESPONSE', () => {
  const state = states.chooseResponse(defaults);

  describe('when respond with move is chosen', () => {
    const action = actions.respondWithMoveChosen();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.TAKE_MOVE_IN_APP, updatedState);
  });

  describe('when respond with refute is chosen', () => {
    const action = actions.respondWithRefuteChosen();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.INITIATE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = walletReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in TAKE_MOVE_IN_APP', () => {
  const state = states.takeMoveInApp(defaults);

  describe('when a challenge move is taken in the application', () => {
    const action = actions.challengePositionReceived(scenarios.aResignsAfterOneRound.restingHex);
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.INITIATE_RESPONSE, updatedState);
  });
  describe('when the challenge times out', () => {
    const action = actions.blockMined({ number: 1, timestamp: 2 });
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });

  describe('when a block is mined but the challenge has not expired', () => {
    const action = actions.blockMined({ number: 1, timestamp: 0 });
    const updatedState = walletReducer(state, action);
    itDoesntTransition(state, updatedState);
  });
});

describe('when in INITIATE_RESPONSE', () => {
  const state = states.initiateResponse(defaults);
  describe('when the challenge response is initiated', () => {
    const action = actions.transactionSentToMetamask();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_RESPONSE_SUBMISSION, updatedState);

  });
});

describe('when in WAIT_FOR_RESPONSE_SUBMISSION', () => {
  const state = states.waitForResponseSubmission(defaults);
  describe('when the challenge response is submitted', () => {
    const action = actions.transactionSubmitted('0x0');
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_RESPONSE_CONFIRMATION, updatedState);
  });
  describe('when an error occurs when submitting a challenge response', () => {
    const action = actions.transactionSubmissionFailed({ code: 0 });
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.RESPONSE_TRANSACTION_FAILED, updatedState);
  });
});

describe('when in WAIT_FOR_RESPONSE_CONFIRMED', () => {
  const state = states.waitForResponseConfirmation(defaults);
  describe('when the challenge response is confirmed', () => {
    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_COMPLETE, updatedState);

  });
});

describe('when in ACKNOWLEDGE_CHALLENGE_COMPLETE', () => {
  const state = states.acknowledgeChallengeComplete(defaults);
  describe('when the challenge is acknowledged as complete', () => {
    const action = actions.challengeResponseAcknowledged();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);

  });
});

describe('when in RESPONSE_TRANSACTION_FAILED', () => {
  const state = states.responseTransactionFailed(defaults);
  describe('when the transaction is retried', () => {
    const action = actions.retryTransaction();
    const createRespondTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createRespondWithMoveTransaction', { value: createRespondTxMock });
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.INITIATE_RESPONSE, updatedState);
    expect(createRespondTxMock.mock.calls.length).toBe(1);

  });
});
