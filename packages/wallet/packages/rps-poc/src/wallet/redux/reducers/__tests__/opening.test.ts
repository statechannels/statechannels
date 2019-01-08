import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';

import { itTransitionsToStateType, itDoesntTransition } from './helpers';
import { scenarios } from '../../../../core';

const {
  preFundSetupAHex,
  preFundSetupBHex,
  preFundSetupASig,
  preFundSetupBSig,
  asAddress,
  bsAddress,
  asPrivateKey,
  bsPrivateKey,
  channelId,
  participants,
  channelNonce,
  libraryAddress,
} = scenarios.standard;

const defaults = {
  networkId:123,
  uid: 'uid',
  address: asAddress,
  privateKey: asPrivateKey,
  libraryAddress,
};

describe('when in WaitForChannel', () => {
  describe('when we send in a PreFundSetupA', () => { // preFundSetupA is A's move, so in this case we need to be player A
    const state = states.waitForChannel(defaults);
    const action = actions.ownPositionReceived(preFundSetupAHex);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_PRE_FUND_SETUP, updatedState);
  });

  describe('when an opponent sends a PreFundSetupA', () => {
    // preFundSetupA is A's move, so in this case we need to be player B
    const state = states.waitForChannel({ ...defaults, address: bsAddress, privateKey: bsPrivateKey });
    const action = actions.opponentPositionReceived(preFundSetupAHex, preFundSetupASig);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_PRE_FUND_SETUP, updatedState);

  });

  describe('when an oppoent sends a PreFundSetupA but the signature is bad', () => {
    const state = states.waitForChannel({ ...defaults, address: bsAddress, privateKey: bsPrivateKey });
    const action = actions.opponentPositionReceived(preFundSetupAHex, 'not-a-signature');
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

  describe('when we send in a a non-PreFundSetupA', () => {
    const state = states.waitForChannel(defaults);
    const action = actions.ownPositionReceived(preFundSetupBHex);
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
  });
});

describe('when in WaitForPreFundSetup', () => {
  const defaults2 = {
    ...defaults,
    channelId,
    participants,
    channelNonce,
    turnNum: 0,
    lastPosition: { data: preFundSetupAHex, signature: 'fake-sig' },
  };

  describe('when we send a PreFundSetupB', () => {
    // preFundSetupB is B's move, so in this case we need to be player B
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 1 });
    const action = actions.ownPositionReceived(preFundSetupBHex);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_FUNDING_REQUEST, updatedState);
  });

  describe('when an opponent sends a PreFundSetupB', () => {
    // preFundSetupB is B's move, so in this case we need to be player A
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 0 });
    const action = actions.opponentPositionReceived(preFundSetupBHex, preFundSetupBSig);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_FUNDING_REQUEST, updatedState);
  });

  describe('when an opponent sends a PreFundSetupB but the signature is bad', () => {
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 0 });
    const action = actions.opponentPositionReceived(preFundSetupAHex, 'not-a-signature');
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

  describe('when we send in a a non-PreFundSetupB', () => {
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 1 });
    const action = actions.ownPositionReceived(preFundSetupAHex);
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

});
