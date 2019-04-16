import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { accumulateSideEffects } from '.';

export const EMPTY_OUTBOX_STATE: OutboxState = {
  displayOutbox: [],
  messageOutbox: [],
  transactionOutbox: [],
};

export interface QueuedTransaction {
  transactionRequest: TransactionRequest;
  processId: string;
}
export interface OutboxState {
  displayOutbox: DisplayAction[];
  messageOutbox: WalletEvent[];
  transactionOutbox: QueuedTransaction[];
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
