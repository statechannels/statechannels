import { fundingStateReducer } from '../reducer';

import * as states from '../state';
import * as actions from '../../actions';
import * as TransactionGenerator from '../../../utils/transaction-generator';

import * as scenarios from '../../__tests__/test-scenarios';
import {
  itChangesChannelFundingStatusTo,
  itSendsThisTransaction,
  itSendsNoTransaction,
  itChangesDepositStatusTo,
} from '../../__tests__/helpers';
import { addHex } from '../../../utils/hex-utils';

const { channelId, twoThree, mockTransactionOutboxItem } = scenarios;

const YOUR_DEPOSIT_A = twoThree[0];
const YOUR_DEPOSIT_B = twoThree[1];
const TOTAL_REQUIRED = twoThree.reduce(addHex);

const defaultsForA: states.DirectFundingStatus = {
  fundingType: states.DIRECT_FUNDING,
  requestedTotalFunds: TOTAL_REQUIRED,
  requestedYourContribution: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: '0x',
  channelFundingStatus: states.NOT_SAFE_TO_DEPOSIT,
};

describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
  // player A scenario
  const createDepositTxMock = jest.fn(() => mockTransactionOutboxItem.transactionRequest);
  Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
    value: createDepositTxMock,
  });
  const state = { ...states.EMPTY_FUNDING_STATE };
  const action = actions.internal.directFundingRequested(
    channelId,
    '0x',
    TOTAL_REQUIRED,
    YOUR_DEPOSIT_A,
    0,
  );
  const updatedState = fundingStateReducer(state, action);

  itChangesChannelFundingStatusTo(states.SAFE_TO_DEPOSIT, {
    state: updatedState.state.directFunding[channelId],
  });
  itSendsThisTransaction(updatedState, mockTransactionOutboxItem);
});

describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
  // player B scenario
  const state = { ...states.EMPTY_FUNDING_STATE };
  const action = actions.internal.directFundingRequested(
    channelId,
    YOUR_DEPOSIT_A,
    TOTAL_REQUIRED,
    YOUR_DEPOSIT_B,
    1,
  );
  const updatedState = fundingStateReducer(state, action);

  itChangesChannelFundingStatusTo(states.NOT_SAFE_TO_DEPOSIT, {
    state: updatedState.state.directFunding[channelId],
  });
  itSendsNoTransaction(updatedState);
});

describe('when a directFunding status already exists for the channel', () => {
  describe.only('incoming action: DIRECT_FUNDING_REQUESTED', () => {
    // player B scenario
    const state = {
      ...states.EMPTY_FUNDING_STATE,
      directFunding: { [channelId]: states.waitForFundingConfirmed(defaultsForA) },
    };
    const action = actions.internal.directFundingRequested(
      channelId,
      '0x00',
      TOTAL_REQUIRED,
      YOUR_DEPOSIT_B,
      1,
    );
    const updatedState = fundingStateReducer(state, action);

    // If the channel weren't already set up in the funding state,
    // the deposit status would be WAIT_FOR_TRANSACTION
    itChangesDepositStatusTo(states.depositing.DEPOSIT_CONFIRMED, {
      state: updatedState.state.directFunding[channelId],
    });
    itSendsNoTransaction(updatedState);
  });
});

describe('When an action comes in for a specific channel', () => {
  const state = {
    ...states.EMPTY_FUNDING_STATE,
    directFunding: { [channelId]: states.notSafeToDeposit(defaultsForA) },
  };
  const action = actions.funding.fundingReceivedEvent(channelId, TOTAL_REQUIRED, TOTAL_REQUIRED);
  const updatedState = fundingStateReducer(state, action);

  itChangesChannelFundingStatusTo(states.CHANNEL_FUNDED, {
    state: updatedState.state.directFunding[channelId],
  });
});
