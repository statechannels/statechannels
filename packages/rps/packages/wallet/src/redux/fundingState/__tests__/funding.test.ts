import { fundingStateReducer } from '../reducer';

import * as states from '../state';
import * as directFundingStates from '../directFunding/state';
import * as actions from '../../actions';
import * as TransactionGenerator from '../../../utils/transaction-generator';

import * as scenarios from '../../__tests__/test-scenarios';
import {
  itChangesChannelFundingStatusTo,
  itSendsThisTransaction,
  itSendsNoTransaction,
} from '../../__tests__/helpers';
import { addHex } from '../../../utils/hex-utils';

const { channelId, twoThree, mockTransaction } = scenarios;

const YOUR_DEPOSIT_A = twoThree[0];
const YOUR_DEPOSIT_B = twoThree[1];
const TOTAL_REQUIRED = twoThree.reduce(addHex);

const defaultsForB: directFundingStates.DirectFundingState = {
  fundingType: states.DIRECT_FUNDING,
  requestedTotalFunds: TOTAL_REQUIRED,
  requestedYourContribution: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 1,
  safeToDepositLevel: '0x',
  channelFundingStatus: directFundingStates.NOT_SAFE_TO_DEPOSIT,
};

describe('start in UNKNOWN_FUNDING_TYPE', () => {
  describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
    // player A scenario
    const createDepositTxMock = jest.fn(() => mockTransaction);
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
      value: createDepositTxMock,
    });
    const state = states.waitForFundingRequest();
    const action = actions.internal.directFundingRequested(
      channelId,
      '0x',
      TOTAL_REQUIRED,
      YOUR_DEPOSIT_A,
      0,
    );
    const updatedState = fundingStateReducer(state, action);

    itChangesChannelFundingStatusTo(states.SAFE_TO_DEPOSIT, updatedState);
    itSendsThisTransaction(updatedState, mockTransaction);
  });

  describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
    // player B scenario
    const state = states.waitForFundingRequest();
    const action = actions.internal.directFundingRequested(
      channelId,
      YOUR_DEPOSIT_A,
      TOTAL_REQUIRED,
      YOUR_DEPOSIT_B,
      1,
    );
    const updatedState = fundingStateReducer(state, action);

    itChangesChannelFundingStatusTo(states.NOT_SAFE_TO_DEPOSIT, updatedState);
    itSendsNoTransaction(updatedState);
  });

  describe('incoming action: FUNDING_RECEIVED_EVENT', () => {
    const state = states.waitForFundingRequest();
    const action = actions.fundingReceivedEvent(channelId, TOTAL_REQUIRED, TOTAL_REQUIRED);
    const updatedState = fundingStateReducer(state, action);

    itChangesChannelFundingStatusTo(states.FUNDING_NOT_STARTED, updatedState);
  });
});

describe('start in DIRECT_FUNDING_TYPE', () => {
  const createDepositTxMock = jest.fn(() => mockTransaction);
  Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
    value: createDepositTxMock,
  });
  const state = states.notSafeToDeposit(defaultsForB);
  const action = actions.fundingReceivedEvent(channelId, YOUR_DEPOSIT_A, YOUR_DEPOSIT_A);

  const updatedState = fundingStateReducer(state, action);
  // TODO: Mock the delegation
  itChangesChannelFundingStatusTo(states.SAFE_TO_DEPOSIT, updatedState);
  itSendsThisTransaction(updatedState, mockTransaction);
});
