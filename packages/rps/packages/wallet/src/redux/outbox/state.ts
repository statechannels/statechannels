import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { WalletProtocol } from '../types';
import { accumulateSideEffects } from '.';

export const EMPTY_OUTBOX_STATE: OutboxState = {
  displayOutbox: [],
  messageOutbox: [],
  transactionOutbox: [],
};

export interface TransactionOutboxItem {
  transactionRequest: TransactionRequest;
  channelId: string;
  protocol: WalletProtocol;
}
export interface OutboxState {
  displayOutbox: DisplayAction[];
  messageOutbox: WalletEvent[];
  transactionOutbox: TransactionOutboxItem[];
}

export type SideEffects = {
  [Outbox in keyof OutboxState]?: OutboxState[Outbox] | OutboxState[Outbox][0]
};

// -------------------
// Getters and setters
// -------------------

export function queueMessage(state: OutboxState, message: WalletEvent): OutboxState {
  return accumulateSideEffects(state, { messageOutbox: [message] });
}

export function queueTransaction(
  state: OutboxState,
  transaction: TransactionOutboxItem,
): OutboxState {
  return accumulateSideEffects(state, { transactionOutbox: [transaction] });
}
