import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from '../../magmo-wallet-client';
import { accumulateSideEffects } from '.';

export function emptyDisplayOutboxState(): OutboxState {
  return { displayOutbox: [], messageOutbox: [], transactionOutbox: [] };
}

export interface QueuedTransaction {
  transactionRequest: TransactionRequest;
  processId: string;
}
export type DisplayOutbox = DisplayAction[];
export type MessageOutbox = WalletEvent[];
export type TransactionOutbox = QueuedTransaction[];

export interface OutboxState {
  displayOutbox: DisplayOutbox;
  messageOutbox: MessageOutbox;
  transactionOutbox: TransactionOutbox;
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
  transaction: TransactionRequest,
  processId: string,
): OutboxState {
  return accumulateSideEffects(state, {
    transactionOutbox: { transactionRequest: transaction, processId },
  });
}

export function getLastMessage(state: OutboxState): WalletEvent | undefined {
  const messages = state.messageOutbox;
  return messages[messages.length - 1];
}
