import { walletReducer } from '../reducer';

import * as states from '../state';
import * as actions from '../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as scenarios from '../__tests__/test-scenarios';
import { OutboxState } from '../outbox/state';

const { channelId, mockTransactionOutboxItem } = scenarios;

const defaults = {
  ...states.emptyState,
  uid: 'uid',
  adjudicator: 'adjudicator',
  networkId: 1,
};

describe('when a side effect occured', () => {
  const sendFundingDeclinedActionA = outgoing.messageRelayRequested('0xa00', 'FundingDeclined');
  const sendFundingDeclinedActionB = outgoing.messageRelayRequested('0xb00', 'FundingDeclined');
  const displayOutbox = [outgoing.hideWallet(), outgoing.showWallet()];
  const actionOutbox = [
    actions.internal.directFundingConfirmed(channelId),
    actions.internal.directFundingConfirmed(channelId),
  ];
  const transactionOutbox = [mockTransactionOutboxItem, mockTransactionOutboxItem];
  const messageOutbox = [sendFundingDeclinedActionA, sendFundingDeclinedActionB];
  const outboxState: OutboxState = {
    displayOutbox,
    actionOutbox,
    transactionOutbox,
    messageOutbox,
  };
  const state = states.initialized({ ...defaults, outboxState });

  it('clears the first element of the displayOutbox', () => {
    const action = actions.displayMessageSent();
    const updatedState = walletReducer(state, action);
    expect(updatedState.outboxState.displayOutbox).toMatchObject(displayOutbox.slice(1));
  });

  it('clears the first element of the messageOutbox', () => {
    const action = actions.messageSent();
    const updatedState = walletReducer(state, action);
    expect(updatedState.outboxState.messageOutbox).toMatchObject(messageOutbox.slice(1));
  });

  it('clears the first element of the transactionOutbox', () => {
    const action = actions.transactionSentToMetamask(channelId);
    const updatedState = walletReducer(state, action);
    expect(updatedState.outboxState.transactionOutbox).toMatchObject(transactionOutbox.slice(1));
  });

  it('clears the first element of the actionOutbox', () => {
    const action = outboxState.actionOutbox[0];
    const updatedState = walletReducer(state, action);
    expect(updatedState.outboxState.actionOutbox).toMatchObject(actionOutbox.slice(1));
  });
});
