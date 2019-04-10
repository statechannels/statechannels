import { clearOutbox } from '../reducer';

import * as actions from '../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as scenarios from '../../__tests__/test-scenarios';
import { OutboxState } from '../state';
import { WalletProcedure } from '../../types';

const { channelId, mockTransactionOutboxItem } = scenarios;

describe('when a side effect occured', () => {
  const sendFundingDeclinedActionA = outgoing.messageRelayRequested('0xa00', {
    processId: '0x0',
    procedure: WalletProcedure.DirectFunding,
    data: 'FundingDeclined',
  });
  const sendFundingDeclinedActionB = outgoing.messageRelayRequested('0xb00', {
    processId: '0x0',
    procedure: WalletProcedure.DirectFunding,
    data: 'FundingDeclined',
  });
  const displayOutbox = [outgoing.hideWallet(), outgoing.showWallet()];
  const transactionOutbox = [mockTransactionOutboxItem, mockTransactionOutboxItem];
  const messageOutbox = [sendFundingDeclinedActionA, sendFundingDeclinedActionB];
  const state: OutboxState = {
    displayOutbox,
    transactionOutbox,
    messageOutbox,
  };

  it('clears the first element of the displayOutbox', () => {
    const action = actions.displayMessageSent();
    const updatedState = clearOutbox(state, action);
    expect(updatedState.displayOutbox).toMatchObject(displayOutbox.slice(1));
  });

  it('clears the first element of the messageOutbox', () => {
    const action = actions.messageSent();
    const updatedState = clearOutbox(state, action);
    expect(updatedState.messageOutbox).toMatchObject(messageOutbox.slice(1));
  });

  it('clears the first element of the transactionOutbox', () => {
    const action = actions.transactionSentToMetamask(channelId, WalletProcedure.DirectFunding);
    const updatedState = clearOutbox(state, action);
    expect(updatedState.transactionOutbox).toMatchObject(transactionOutbox.slice(1));
  });
});
