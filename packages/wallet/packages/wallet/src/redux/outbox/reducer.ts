import { OutboxState } from './state';
import * as actions from '../actions';

export function clearOutbox(state: OutboxState, action: actions.WalletAction): OutboxState {
  const nextOutbox = { ...state };
  if (action.type === actions.MESSAGE_SENT) {
    nextOutbox.messageOutbox = nextOutbox.messageOutbox.slice(1);
  }
  if (action.type === actions.DISPLAY_MESSAGE_SENT) {
    nextOutbox.displayOutbox = nextOutbox.displayOutbox.slice(1);
  }
  if (action.type === actions.TRANSACTION_SENT_TO_METAMASK) {
    // TODO: Should this be a channel message?
    nextOutbox.transactionOutbox = nextOutbox.transactionOutbox.slice(1);
  }
  if (action.type.match('WALLET.INTERNAL')) {
    // For the moment, only one action should ever be put in the actionOutbox,
    // so it's always safe to clear it.
    nextOutbox.actionOutbox = nextOutbox.actionOutbox.slice(1);
  }
  return nextOutbox;
}
