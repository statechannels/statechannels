import { closingReducer } from '../reducer';

import * as states from '../../state';
import * as actions from '../../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as scenarios from '../../../__tests__/test-scenarios';
import {
  itTransitionsToChannelStateType,
  itSendsThisMessage,
  itSendsThisTransaction,
} from '../../../__tests__/helpers';

import * as SigningUtil from '../../../../utils/signing-utils';
import * as ReducerUtil from '../../../../utils/reducer-utils';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import { Commitment } from 'fmg-core/lib/commitment';
import { bigNumberify } from 'ethers/utils';
import { WalletProcedure } from '../../../types';

const {
  asAddress,
  asPrivateKey,
  channel,
  gameCommitment1,
  gameCommitment2,
  concludeCommitment1,
  concludeCommitment2,
  channelId,
  fundingState,
  mockTransactionOutboxItem,
} = scenarios;
const defaults = {
  adjudicator: 'adj-address',
  channelId,
  channelNonce: channel.nonce,
  libraryAddress: channel.channelType,
  networkId: 3,
  participants: channel.participants as [string, string],
  uid: 'uid',
  transactionHash: '0x0',
  fundingState,
  funded: true,
};

const defaultsA = {
  ...defaults,
  ourIndex: 0,
  address: asAddress,
  privateKey: asPrivateKey,
  requestedYourContribution: bigNumberify(500000000000000).toHexString(),
};

describe('start in AcknowledgeConclude', () => {
  describe('action taken: conclude approved', () => {
    // TODO: Why should you conditionally transition to ApproveCloseOnChain or AcknowledgeCloseSuccess
    // based on whether the adjudicator is on the current state?

    const state = states.acknowledgeConclude({
      ...defaultsA,
      penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
      lastCommitment: { commitment: concludeCommitment1, signature: 'sig' },
      turnNum: 9,
    });

    const action = actions.channel.concludeApproved();

    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
    itSendsThisMessage(updatedState, outgoing.MESSAGE_RELAY_REQUESTED);
  });
});

describe('start in ApproveConclude', () => {
  describe('action taken: conclude rejected', () => {
    const state = states.approveConclude({
      ...defaultsA,
      penultimateCommitment: { commitment: gameCommitment1, signature: 'sig' },
      lastCommitment: { commitment: gameCommitment2, signature: 'sig' },
      turnNum: 1,
    });
    const action = actions.channel.concludeRejected();
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
  });

  describe('action taken: conclude approved', () => {
    const state = states.approveConclude({
      ...defaultsA,
      penultimateCommitment: { commitment: gameCommitment1, signature: 'sig' },
      lastCommitment: { commitment: gameCommitment2, signature: 'sig' },
      turnNum: 1,
    });

    const action = actions.channel.concludeApproved();
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_OPPONENT_CONCLUDE, updatedState);
  });
});

describe('start in WaitForOpponentConclude', () => {
  describe('action taken: messageReceived', () => {
    const state = states.waitForOpponentConclude({
      ...defaultsA,
      penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
      lastCommitment: { commitment: concludeCommitment1, signature: 'sig' },
      turnNum: concludeCommitment1.turnNum,
    });
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });
    Object.defineProperty(ReducerUtil, 'validTransition', { value: validateMock });

    const action = actions.commitmentReceived(
      channelId,
      WalletProcedure.DirectFunding,
      ('commitment' as unknown) as Commitment,
      '0x0',
    );
    describe(' where the adjudicator exists', () => {
      const updatedState = closingReducer(state, action);
      itTransitionsToChannelStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
      itSendsThisMessage(updatedState, outgoing.CONCLUDE_SUCCESS);
    });
  });
});

describe('start in ApproveCloseOnChain', () => {
  const state = states.approveCloseOnChain({
    ...defaultsA,
    penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
    lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
    turnNum: concludeCommitment2.turnNum,
    userAddress: '0x0',
  });
  describe('action taken: approve close on chain', () => {
    const createConcludeTxMock = jest.fn(() => mockTransactionOutboxItem.transactionRequest);
    Object.defineProperty(TransactionGenerator, 'createConcludeAndWithdrawTransaction', {
      value: createConcludeTxMock,
    });
    const signVerMock = jest.fn();
    signVerMock.mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signVerMock });
    const action = actions.channel.approveClose('0x0');
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CLOSE_INITIATION, updatedState);
    itSendsThisTransaction(updatedState, mockTransactionOutboxItem);
  });
});

describe('start in WaitForCloseInitiation', () => {
  const state = states.waitForCloseInitiation({
    ...defaultsA,
    penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
    lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
    turnNum: concludeCommitment2.turnNum,
    userAddress: '0x0',
  });
  describe('action taken: transaction sent to metamask', () => {
    const action = actions.transactionSentToMetamask(channelId, WalletProcedure.Closing);
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CLOSE_SUBMISSION, updatedState);
  });
});

describe('start in WaitForCloseSubmission', () => {
  const state = states.waitForCloseSubmission({
    ...defaultsA,
    penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
    lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
    turnNum: concludeCommitment2.turnNum,
    userAddress: '0x0',
  });
  describe('action taken: transaction submitted', () => {
    const action = actions.transactionSubmitted(channelId, WalletProcedure.Closing, '0x0');
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CLOSE_CONFIRMED, updatedState);
  });
  describe('action taken: transaction submitted', () => {
    const action = actions.transactionSubmissionFailed(channelId, WalletProcedure.Closing, {
      code: 0,
    });
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.CLOSE_TRANSACTION_FAILED, updatedState);
  });
});

describe('start in closeTransactionFailed', () => {
  const state = states.closeTransactionFailed({
    ...defaultsA,
    penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
    lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
    turnNum: concludeCommitment2.turnNum,
    userAddress: '0x0',
  });

  describe('action taken: retry transaction', () => {
    const createConcludeTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createConcludeAndWithdrawTransaction', {
      value: createConcludeTxMock,
    });
    const signVerMock = jest.fn();
    signVerMock.mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signVerMock });
    const action = actions.retryTransaction(channelId, WalletProcedure.Responding);
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CLOSE_SUBMISSION, updatedState);
    expect(createConcludeTxMock.mock.calls.length).toBe(1);
  });
});

describe('start in WaitForCloseConfirmed', () => {
  const state = states.waitForCloseConfirmed({
    ...defaultsA,
    penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
    lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
    turnNum: concludeCommitment2.turnNum,
  });
  describe('action taken: transaction confirmed', () => {
    const action = actions.transactionConfirmed(channelId, WalletProcedure.Closing);
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
  });
});

describe('start in AcknowledgCloseSuccess', () => {
  describe('action taken: close success acknowledged', () => {
    const state = states.acknowledgeCloseSuccess({
      ...defaultsA,
      penultimateCommitment: { commitment: concludeCommitment1, signature: 'sig' },
      lastCommitment: { commitment: concludeCommitment2, signature: 'sig' },
      turnNum: concludeCommitment2.turnNum,
    });

    const action = actions.channel.closeSuccessAcknowledged();
    const updatedState = closingReducer(state, action);
    itTransitionsToChannelStateType(states.WAIT_FOR_CHANNEL, updatedState);
    itSendsThisMessage(updatedState, outgoing.CLOSE_SUCCESS);
  });
});
