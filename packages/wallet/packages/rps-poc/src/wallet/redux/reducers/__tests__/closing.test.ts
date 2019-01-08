import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';
import * as outgoing from '../../../interface/outgoing';
import * as TransactionGenerator from '../../../utils/transaction-generator';
import { scenarios } from '../../../../core';
import { itTransitionsToStateType } from './helpers';

const {
  asAddress,
  asPrivateKey,
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  proposeHex,
  acceptHex,
} = scenarios.standard;

const aResignsAfterOneRound = scenarios.aResignsAfterOneRound;
const bResignsAfterOneRound = scenarios.bResignsAfterOneRound;

const defaults = {
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  networkId: 3,
  participants,
  uid: 'uid',
};

const defaultsA = {
  ...defaults,
  ourIndex: 0,
  address: asAddress,
  privateKey: asPrivateKey,
};

describe('start in ApproveConclude', () => {
  describe('action taken: conclude approved, first conclude state', () => {
    const state = states.approveConclude({
      ...defaultsA,
      penultimatePosition: { data: proposeHex, signature: 'sig' },
      lastPosition: { data: acceptHex, signature: 'sig' },
      turnNum: 1,
    });

    const action = actions.concludeApproved();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_OPPONENT_CONCLUDE, updatedState);
  });

  describe('action taken: conclude approved, second conclude state', () => {
    const state = states.approveConclude({
      ...defaultsA,
      penultimatePosition: { data: proposeHex, signature: 'sig' },
      lastPosition: { data: bResignsAfterOneRound.concludeHex, signature: 'sig' },
      turnNum: 1,
    });

    const action = actions.concludeApproved();
    describe(' where the adjudicator exists', () => {
      const updatedState = walletReducer(state, action);
      itTransitionsToStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
      expect((updatedState.messageOutbox!).type).toEqual(outgoing.SEND_MESSAGE);
    });
    describe(' where the adjudicator does not exist', () => {
      state.adjudicator = undefined;
      const updatedState = walletReducer(state, action);
      itTransitionsToStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
      expect((updatedState.messageOutbox!).type).toEqual(outgoing.CONCLUDE_SUCCESS);
    });
  });

});

describe('start in WaitForOpponentConclude', () => {
  describe('action taken: messageReceived', () => {
    const state = states.waitForOpponentConclude({
      ...defaultsA,
      penultimatePosition: { data: aResignsAfterOneRound.restingHex, signature: 'sig' },
      lastPosition: { data: aResignsAfterOneRound.concludeHex, signature: 'sig' },
      turnNum: 8,
    });

    const action = actions.messageReceived(aResignsAfterOneRound.conclude2Hex, aResignsAfterOneRound.conclude2Sig);
    describe(' where the adjudicator exists', () => {
      const updatedState = walletReducer(state, action);
      itTransitionsToStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
      expect((updatedState.messageOutbox!).type).toEqual(outgoing.CONCLUDE_SUCCESS);
    });
    describe(' where the adjudicator does not exist', () => {
      state.adjudicator = undefined;
      const updatedState = walletReducer(state, action);
      itTransitionsToStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
      expect((updatedState.messageOutbox!).type).toEqual(outgoing.CONCLUDE_SUCCESS);
    });
  });
});

describe('start in ApproveCloseOnChain', () => {
  const state = states.approveCloseOnChain({
    ...defaultsA,
    penultimatePosition: { data: aResignsAfterOneRound.concludeHex, signature: aResignsAfterOneRound.conclude2Sig },
    lastPosition: { data: aResignsAfterOneRound.conclude2Hex, signature: aResignsAfterOneRound.conclude2Sig },
    turnNum: 9,
  });
  describe('action taken: approve close on chain', () => {
    // TODO: Mock out Signature contructor so we don't have to pass a valid signature string in 
    const createConcludeTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createConcludeTransaction', { value: createConcludeTxMock });
    const action = actions.approveClose();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_INITIATION, updatedState);
  });

  describe('action taken: game concluded event', () => {
    const action = actions.gameConcludedEvent();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);
  });

});

describe('start in WaitForCloseInitiation', () => {
  const state = states.waitForCloseInitiation({
    ...defaultsA,
    penultimatePosition: { data: aResignsAfterOneRound.concludeHex, signature: aResignsAfterOneRound.conclude2Sig },
    lastPosition: { data: aResignsAfterOneRound.conclude2Hex, signature: aResignsAfterOneRound.conclude2Sig },
    turnNum: 9,
  });
  describe('action taken: transaction sent to metamask', () => {

    const action = actions.transactionSentToMetamask();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_SUBMISSION, updatedState);
  });
  describe('action taken: game concluded event', () => {
    const action = actions.gameConcludedEvent();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);
  });
});

describe('start in WaitForCloseSubmission', () => {
  const state = states.waitForCloseSubmission({
    ...defaultsA,
    penultimatePosition: { data: aResignsAfterOneRound.concludeHex, signature: aResignsAfterOneRound.conclude2Sig },
    lastPosition: { data: aResignsAfterOneRound.conclude2Hex, signature: aResignsAfterOneRound.conclude2Sig },
    turnNum: 9,
  });
  describe('action taken: transaction submitted', () => {

    const action = actions.transactionSubmitted();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_CONFIRMED, updatedState);
  });
  describe('action taken: game concluded event', () => {
    const action = actions.gameConcludedEvent();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);
  });
});


describe('start in WaitForCloseConfirmed', () => {
  const state = states.waitForCloseConfirmed({
    ...defaultsA,
    penultimatePosition: { data: aResignsAfterOneRound.concludeHex, signature: aResignsAfterOneRound.conclude2Sig },
    lastPosition: { data: aResignsAfterOneRound.conclude2Hex, signature: aResignsAfterOneRound.conclude2Sig },
    turnNum: 9,
  });
  describe('action taken: transaction confirmed', () => {

    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);
  });
  describe('action taken: game concluded event', () => {
    const action = actions.gameConcludedEvent();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.APPROVE_WITHDRAWAL, updatedState);
  });
});

describe('start in AcknowledgCloseSuccess', () => {
  describe('action taken: close success acknowledged', () => {
    const state = states.acknowledgeCloseSuccess({
      ...defaultsA,
      penultimatePosition: { data: aResignsAfterOneRound.concludeHex, signature: 'sig' },
      lastPosition: { data: aResignsAfterOneRound.conclude2Hex, signature: 'sig' },
      turnNum: 9,
    });

    const action = actions.closeSuccessAcknowledged();
    const updatedState = walletReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
    expect((updatedState.messageOutbox!).type).toEqual(outgoing.CLOSE_SUCCESS);
  });
});
