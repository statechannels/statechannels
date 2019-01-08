import { walletReducer } from '..';
import { scenarios } from '../../../../core';
import * as states from '../../../states';
import * as actions from '../../actions';
import { itSendsATransaction, itTransitionsToStateType } from './helpers';

const {
  asPrivateKey,
  acceptHex,
  acceptSig,
  proposeHex,
  proposeSig,
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
  lastPosition: { data: acceptHex, signature: acceptSig },
  penultimatePosition: { data: proposeHex, signature: proposeSig },
  turnNum: 6,
  adjudicator: 'adj-address',
  ourIndex: 0,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 2323,
  challengeExpiry: 12321,

};


describe('when in APPROVE_CHALLENGE', () => {
  const state = states.approveChallenge({ ...defaults });
  describe('when a challenge is approved', () => {
    const action = actions.challengeApproved();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CHALLENGE_INITIATION, updatedState);
    itSendsATransaction(updatedState);
  });

  describe('when a challenge is declined', () => {
    const action = actions.challengeRejected();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);
  });
});

describe('when in INITIATE_CHALLENGE', () => {
  const transaction = {};
  const state = states.waitForChallengeInitiation(transaction, defaults);

  describe('when a challenge is initiated', () => {
    const action = actions.transactionSentToMetamask();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHALLENGE_SUBMISSION, updatedState);
  });
});

describe('when in WAIT_FOR_CHALLENGE_SUBMISSION', () => {
  const state = states.waitForChallengeSubmission(defaults);

  describe('when a challenge is submitted', () => {
    const action = actions.transactionSubmitted();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHALLENGE_CONFIRMATION, updatedState);
  });
});


describe('when in WAIT_FOR_CHALLENGE_CONFIRMATION', () => {
  const state = states.waitForChallengeConfirmation({ ...defaults });

  describe('when a challenge is confirmed', () => {
    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_RESPONSE_OR_TIMEOUT, updatedState);
  });
});

describe('when in WAIT_FOR_RESPONSE_OR_TIMEOUT', () => {
  const state = states.waitForResponseOrTimeout({ ...defaults, challengeExpiry: 1, moveSelected: false, });

  describe('when the opponent responds', () => {
    const action = actions.respondWithMoveEvent('0xC1');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.challengedTimedOut();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
  });
});

describe('when in ACKNOWLEDGE_RESPONSE', () => {
  const state = states.acknowledgeChallengeResponse({ ...defaults });
  const action = actions.challengeResponseAcknowledged();
  const updatedState = walletReducer(state, action);

  itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);

});

describe('when in ACKNOWLEDGE_TIMEOUT', () => {
  const state = states.acknowledgeChallengeTimeout({ ...defaults });
  const action = actions.challengedTimedOutAcknowledged();
  const updatedState = walletReducer(state, action);

  itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);

});
