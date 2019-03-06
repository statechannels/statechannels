import { walletReducer } from '..';

import * as states from '../.././states';
import * as actions from '../../actions';

import { itTransitionsToStateType, itDoesntTransition } from './helpers';
import * as scenarios from './test-scenarios';
import * as SigningUtil from '../../../utils/signing-utils';
import { validationFailure, SIGNATURE_FAILURE } from 'magmo-wallet-client';

const {
  asAddress,
  asPrivateKey,
  libraryAddress,
  preFundCommitment1,
  preFundCommitment2,
  bsAddress,
  bsPrivateKey,
} = scenarios;

const defaults = {
  networkId: 123,
  uid: 'uid',
  address: asAddress,
  privateKey: asPrivateKey,
  libraryAddress,
  adjudicator: '0x0',
};

describe('when in WaitForChannel', () => {
  describe("when another user logs in ", () => {
    const state = states.waitForChannel(defaults);
    const action = actions.loggedIn(defaults.uid);
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_ADDRESS, updatedState);
  });

  describe('when we send in a PreFundSetupA', () => { // preFundSetupA is A's move, so in this case we need to be player A
    const state = states.waitForChannel(defaults);
    const action = actions.ownCommitmentReceived(preFundCommitment1);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_PRE_FUND_SETUP, updatedState);
  });

  describe('when an opponent sends a PreFundSetupA', () => {
    // preFundSetupA is A's move, so in this case we need to be player B
    const state = states.waitForChannel({ ...defaults, address: bsAddress, privateKey: bsPrivateKey });
    const action = actions.opponentCommitmentReceived(preFundCommitment1, "sig");
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_PRE_FUND_SETUP, updatedState);

  });

  describe('when an opponent sends a PreFundSetupA but the signature is bad', () => {
    const state = states.waitForChannel({ ...defaults, address: bsAddress, privateKey: bsPrivateKey });
    const action = actions.opponentCommitmentReceived(preFundCommitment1, 'not-a-signature');
    const validateMock = jest.fn().mockReturnValue(false);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
    it(`sends a validation failed message`, () => {
      expect(updatedState.messageOutbox).toEqual(validationFailure('InvalidSignature'));
    });

  });

  describe('when we send in a a non-PreFundSetupA', () => {
    const state = states.waitForChannel(defaults);
    const action = actions.ownCommitmentReceived(preFundCommitment2);
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
    it(`sends a signature failed message`, () => {
      expect(updatedState.messageOutbox!.type).toEqual(SIGNATURE_FAILURE);
    });
  });
});

describe('when in WaitForPreFundSetup', () => {
  const defaults2 = {
    ...defaults,
    channelId: scenarios.channelId,
    channelNonce: scenarios.channelNonce,
    participants: scenarios.channel.participants as [string, string],
    turnNum: 0,
    lastCommitment: { commitment: preFundCommitment1, signature: 'fake-sig' },
    adjudicator: '0x0',
    requestedTotalFunds: '0x0',
    requestedYourDeposit: '0x0',
  };

  describe('when we send a PreFundSetupB', () => {
    // preFundSetupB is B's move, so in this case we need to be player B
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 1 });
    const action = actions.ownCommitmentReceived(preFundCommitment2);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_FUNDING_REQUEST, updatedState);
  });

  describe('when an opponent sends a PreFundSetupB', () => {
    // preFundSetupB is B's move, so in this case we need to be player A
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 0 });
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const action = actions.opponentCommitmentReceived(preFundCommitment2, 'sig');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_FUNDING_REQUEST, updatedState);
  });

  describe('when an opponent sends a PreFundSetupB but the signature is bad', () => {
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 0 });
    const action = actions.opponentCommitmentReceived(preFundCommitment2, 'sig');
    const validateMock = jest.fn().mockReturnValue(false);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const updatedState = walletReducer(state, action);
    itDoesntTransition(state, updatedState);
    it(`sends a validation failed message`, () => {
      expect(updatedState.messageOutbox).toEqual(validationFailure('InvalidSignature'));
    });
  });

  describe('when we send in a a non-PreFundSetupB', () => {
    const state = states.waitForPreFundSetup({ ...defaults2, ourIndex: 1 });
    const action = actions.ownCommitmentReceived(preFundCommitment1);
    const updatedState = walletReducer(state, action);

    itDoesntTransition(state, updatedState);
    it(`sends a signature failed message`, () => {
      expect(updatedState.messageOutbox!.type).toEqual(SIGNATURE_FAILURE);
    });
  });

});
