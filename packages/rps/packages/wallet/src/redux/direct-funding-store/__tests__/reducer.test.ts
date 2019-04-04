import { directFundingStoreReducer } from '../reducer';

import * as states from '../direct-funding-state/state';
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

const defaultsForA: states.DirectFundingState = {
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
  const state = {};
  const action = actions.internal.directFundingRequested(
    channelId,
    '0x',
    TOTAL_REQUIRED,
    YOUR_DEPOSIT_A,
    0,
  );
  const updatedState = directFundingStoreReducer(state, action);

  itChangesChannelFundingStatusTo(states.SAFE_TO_DEPOSIT, {
    state: updatedState.state[channelId],
  });
  itSendsThisTransaction(updatedState, mockTransactionOutboxItem);
});

describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
  // player B scenario
  const state = {};
  const action = actions.internal.directFundingRequested(
    channelId,
    YOUR_DEPOSIT_A,
    TOTAL_REQUIRED,
    YOUR_DEPOSIT_B,
    1,
  );
  const updatedState = directFundingStoreReducer(state, action);

  itChangesChannelFundingStatusTo(states.NOT_SAFE_TO_DEPOSIT, {
    state: updatedState.state[channelId],
  });
  itSendsNoTransaction(updatedState);
});

describe('when a directFunding status already exists for the channel', () => {
  describe('incoming action: DIRECT_FUNDING_REQUESTED', () => {
    // player B scenario
    const state = {
      [channelId]: states.waitForFundingConfirmed(defaultsForA),
    };
    const action = actions.internal.directFundingRequested(
      channelId,
      '0x00',
      TOTAL_REQUIRED,
      YOUR_DEPOSIT_B,
      1,
    );
    const updatedState = directFundingStoreReducer(state, action);

    // If the channel weren't already set up in the funding state,
    // the deposit status would be WAIT_FOR_TRANSACTION
    itChangesDepositStatusTo(states.depositing.DEPOSIT_CONFIRMED, {
      state: updatedState.state[channelId],
    });
    itSendsNoTransaction(updatedState);
  });
});
