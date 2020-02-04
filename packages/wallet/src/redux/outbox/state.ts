import {TransactionRequest} from "ethers/providers";

import {OutgoingApiAction} from "../sagas/messaging/outgoing-api-actions";

import {accumulateSideEffects} from ".";

export function emptyDisplayOutboxState(): OutboxState {
  return {displayOutbox: [], messageOutbox: [], transactionOutbox: []};
}
export type TransactionRequestWithTarget = TransactionRequest & {to: string};
export interface QueuedTransaction {
  transactionRequest: TransactionRequestWithTarget;
  processId: string;
}
export type DisplayOutbox = Array<"Show" | "Hide">;
export type MessageOutbox = OutgoingApiAction[];
export type TransactionOutbox = QueuedTransaction[];

export interface OutboxState {
  displayOutbox: DisplayOutbox;
  messageOutbox: MessageOutbox;
  transactionOutbox: TransactionOutbox;
}

export type SideEffects = {
  [Outbox in keyof OutboxState]?: OutboxState[Outbox] | OutboxState[Outbox][0];
};

// -------------------
// Getters and setters
// -------------------

export function queueMessage(state: OutboxState, message: OutgoingApiAction): OutboxState {
  return accumulateSideEffects(state, {messageOutbox: [message]});
}

export function queueTransaction(
  state: OutboxState,
  transaction: TransactionRequestWithTarget,
  processId: string
): OutboxState {
  return accumulateSideEffects(state, {
    transactionOutbox: {transactionRequest: transaction, processId}
  });
}

export function getLastMessage(state: OutboxState): OutgoingApiAction | undefined {
  const messages = state.messageOutbox;
  return messages[messages.length - 1];
}
