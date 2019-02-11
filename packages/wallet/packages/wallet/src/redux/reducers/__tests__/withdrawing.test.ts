import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';

import { itTransitionsToStateType } from './helpers';
import * as scenarios from './test-scenarios';
import * as TransactionGenerator from '../../../utils/transaction-generator';
import * as SigningUtil from '../../../utils/signing-utils';
import BN from "bn.js";
import bnToHex from "../../../utils/bnToHex";

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
  ourIndex: 0,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 23213,
  transactionHash: '0x0',
  userAddress: '0x0',
  requestedTotalFunds: bnToHex(new BN(1000000000000000)),
  requestedYourDeposit: bnToHex(new BN(500000000000000)),
};


describe('when in ApproveWithdrawal', () => {
  const state = states.approveWithdrawal(defaults);

  describe('and the user approves the withdrawal', () => {
    const destinationAddress = '0x123';
    const createWithdrawTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createWithdrawTransaction', { value: createWithdrawTxMock });
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signMock });

    const action = actions.withdrawalApproved(destinationAddress);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_WITHDRAWAL_INITIATION, updatedState);
    expect(createWithdrawTxMock.mock.calls.length).toBe(1);
  });

  describe('and the user rejects the withdrawal', () => {
    const action = actions.withdrawalRejected();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
  });
});

describe('when in WaitForWithdrawalInitiation', () => {
  const state = states.waitForWithdrawalInitiation(defaults);

  describe('and the transaction is submitted', () => {
    const action = actions.transactionSubmitted('0x0');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_WITHDRAWAL_CONFIRMATION, updatedState);
  });
  describe('and the transaction submission errors', () => {
    const action = actions.transactionSubmissionFailed({ code: 0 });
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WITHDRAW_TRANSACTION_FAILED, updatedState);
  });
});

describe('when in withdrawTransactionFailed', () => {
  describe('and the transaction is retried', () => {
    const createWithdrawTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createWithdrawTransaction', { value: createWithdrawTxMock });
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signMock });

    const state = states.withdrawTransactionFailed(defaults);
    const action = actions.retryTransaction();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_WITHDRAWAL_INITIATION, updatedState);
    expect(createWithdrawTxMock.mock.calls.length).toBe(1);
  });
});

describe('when in WaitForWithdrawalConfirmation', () => {
  const state = states.waitForWithdrawalConfirmation(defaults);

  describe('and the transaction is confirmed', () => {
    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_WITHDRAWAL_SUCCESS, updatedState);
  });
});

describe('when in AcknowledgeWithdrawalSuccess', () => {
  const state = states.acknowledgeWithdrawalSuccess(defaults);

  describe('and the user acknowledges the withdrawal', () => {
    const action = actions.withdrawalSuccessAcknowledged();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
  });
});
