import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { internal } from '../actions';

export const EMPTY_OUTBOX_STATE: OutboxState = {
  displayOutbox: [],
  messageOutbox: [],
  transactionOutbox: [],
  actionOutbox: [],
};

export interface TransactionOutboxItem {
  transactionRequest: TransactionRequest;
  channelId: string;
}
export interface OutboxState {
  displayOutbox: DisplayAction[];
  messageOutbox: WalletEvent[];
  transactionOutbox: TransactionOutboxItem[];
  actionOutbox: internal.InternalAction[];
}

export type SideEffects = {
  [Outbox in keyof OutboxState]?: OutboxState[Outbox] | OutboxState[Outbox][0]
};
