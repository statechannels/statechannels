import { closingReducer } from '../channels/closing';

import * as states from '../../states/channels';
import * as actions from '../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as scenarios from './test-scenarios';
import { itTransitionsToStateType, itSendsThisMessage, itSendsThisTransaction } from './helpers';

import * as SigningUtil from '../../../utils/signing-utils';
import * as ReducerUtil from '../../../utils/reducer-utils';
import * as TransactionGenerator from '../../../utils/transaction-generator';
import { bigNumberify } from 'ethers/utils';
import { Commitment } from 'fmg-core/lib/commitment';

const {
  asAddress,
  asPrivateKey,
  channel,
  gameCommitment1,
  gameCommitment2,
  concludeCommitment1,
  concludeCommitment2,
  channelId,
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
  requestedTotalFunds: bigNumberify(1000000000000000).toHexString(),
};

const defaultsA = {
  ...defaults,
  ourIndex: 0,
  address: asAddress,
  privateKey: asPrivateKey,
  requestedYourDeposit: bigNumberify(500000000000000).toHexString(),
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

    const action = actions.concludeApproved();

    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
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
    const action = actions.concludeRejected();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);
  });

  describe('action taken: conclude approved', () => {
    const state = states.approveConclude({
      ...defaultsA,
      penultimateCommitment: { commitment: gameCommitment1, signature: 'sig' },
      lastCommitment: { commitment: gameCommitment2, signature: 'sig' },
      turnNum: 1,
    });

    const action = actions.concludeApproved();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_OPPONENT_CONCLUDE, updatedState);
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

    const action = actions.commitmentReceived(('commitment' as unknown) as Commitment, '0x0');
    describe(' where the adjudicator exists', () => {
      const updatedState = closingReducer(state, action);
      itTransitionsToStateType(states.APPROVE_CLOSE_ON_CHAIN, updatedState);
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
    const createConcludeTxMock = jest.fn(() => 'conclude-tx');
    Object.defineProperty(TransactionGenerator, 'createConcludeAndWithdrawTransaction', {
      value: createConcludeTxMock,
    });
    const signVerMock = jest.fn();
    signVerMock.mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'signVerificationData', { value: signVerMock });
    const action = actions.approveClose('0x0');
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_INITIATION, updatedState);
    itSendsThisTransaction(updatedState, 'conclude-tx');
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
    const action = actions.transactionSentToMetamask();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_SUBMISSION, updatedState);
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
    const action = actions.transactionSubmitted('0x0');
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_CONFIRMED, updatedState);
  });
  describe('action taken: transaction submitted', () => {
    const action = actions.transactionSubmissionFailed({ code: 0 });
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.CLOSE_TRANSACTION_FAILED, updatedState);
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
    const action = actions.retryTransaction();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CLOSE_SUBMISSION, updatedState);
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
    const action = actions.transactionConfirmed();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.ACKNOWLEDGE_CLOSE_SUCCESS, updatedState);
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

    const action = actions.closeSuccessAcknowledged();
    const updatedState = closingReducer(state, action);
    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
    itSendsThisMessage(updatedState, outgoing.CLOSE_SUCCESS);
  });
});
