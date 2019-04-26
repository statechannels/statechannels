import { withdrawingReducer } from '../reducer';

import * as states from '../../state';
import * as actions from '../../../actions';

import { itTransitionsToChannelStateType } from '../../../__tests__/helpers';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import * as SigningUtil from '../../../../domain';
import { WalletProtocol } from '../../../types';

const {
  asPrivateKey,
  gameCommitment1,
  gameCommitment2,
  participants,
  channelId,
  channelNonce,
  libraryAddress,
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
  ourIndex: 0,
  address: 'address',
  privateKey: asPrivateKey,
  networkId: 23213,
  transactionHash: '0x0',
  userAddress: '0x0',
  fundingState,
  funded: false,
};

describe('when in ApproveWithdrawal', () => {
  const state = states.approveWithdrawal(defaults);

  describe('and the user approves the withdrawal', () => {
    const destinationAddress = '0x123';
    const createWithdrawTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createTransferAndWithdrawTransaction', {
      value: createWithdrawTxMock,
    });
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signMock });

    const action = actions.channel.withdrawalApproved(destinationAddress);
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_WITHDRAWAL_INITIATION, updatedState);
    expect(createWithdrawTxMock.mock.calls.length).toBe(1);
  });

  describe('and the user rejects the withdrawal', () => {
    const action = actions.channel.withdrawalRejected();
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
  });
});

describe('when in WaitForWithdrawalInitiation', () => {
  const state = states.waitForWithdrawalInitiation(defaults);

  describe('and the transaction is submitted', () => {
    const action = actions.transactionSubmitted(channelId, '0x0');
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_WITHDRAWAL_CONFIRMATION, updatedState);
  });
  describe('and the transaction submission errors', () => {
    const action = actions.transactionSubmissionFailed(channelId, {
      code: 0,
    });
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.WITHDRAW_TRANSACTION_FAILED, updatedState);
  });
});

describe('when in withdrawTransactionFailed', () => {
  describe('and the transaction is retried', () => {
    const createWithdrawTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createTransferAndWithdrawTransaction', {
      value: createWithdrawTxMock,
    });
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signMock });

    const state = states.withdrawTransactionFailed(defaults);
    const action = actions.transactionRetryApproved(channelId);
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_WITHDRAWAL_INITIATION, updatedState);
    expect(createWithdrawTxMock.mock.calls.length).toBe(1);
  });
});

describe('when in WaitForWithdrawalConfirmation', () => {
  const state = states.waitForWithdrawalConfirmation(defaults);

  describe('and the transaction is confirmed', () => {
    const action = actions.transactionConfirmed(channelId, WalletProtocol.Withdrawing);
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_WITHDRAWAL_SUCCESS, updatedState);
  });
});

describe('when in AcknowledgeWithdrawalSuccess', () => {
  const state = states.acknowledgeWithdrawalSuccess(defaults);

  describe('and the user acknowledges the withdrawal', () => {
    const action = actions.channel.withdrawalSuccessAcknowledged();
    const updatedState = withdrawingReducer(state, action);

    itTransitionsToChannelStateType(states.FINALIZED, updatedState);
  });
});
