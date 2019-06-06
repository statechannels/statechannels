import { OutboxState } from './state';
import * as actions from '../actions';

export function clearOutbox(state: OutboxState, action: actions.WalletAction): OutboxState {
  const nextOutbox = { ...state };
  if (action.type === 'WALLET.MESSAGE_SENT') {
    nextOutbox.messageOutbox = nextOutbox.messageOutbox.slice(1);
  }
  if (action.type === 'WALLET.DISPLAY_MESSAGE_SENT') {
    nextOutbox.displayOutbox = nextOutbox.displayOutbox.slice(1);
  }
  if (action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT') {
    // TODO: Should this be a channel message?
    nextOutbox.transactionOutbox = nextOutbox.transactionOutbox.slice(1);
  }

  return nextOutbox;
}
