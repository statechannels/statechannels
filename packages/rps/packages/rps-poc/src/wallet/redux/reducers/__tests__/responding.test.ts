import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';

import { itTransitionsToStateType } from './helpers';
import { scenarios } from '../../../../core';
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
  challengeExpiry: 0,
  moveSelected: false,
  challengeOptions: [],
};

describe('when in ACKNOWLEDGE_CHALLENGE', () => {
  const state = states.acknowledgeChallenge(defaults);

  describe('when a challenge is acknowledged', () => {
    const action = actions.challengeAcknowledged();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.CHOOSE_RESPONSE, updatedState);
  });

  describe('when the challenge times out', () => {
    const action = actions.challengedTimedOut();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
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
    const action = actions.challengedTimedOut();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
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
    const action = actions.challengedTimedOut();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CHALLENGE_TIMEOUT, updatedState);
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
    const action = actions.transactionSubmitted();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_RESPONSE_CONFIRMATION, updatedState);

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
