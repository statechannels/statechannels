import {
  TransactionOutboxItem,
  queueTransaction as queueTransactionOutbox,
} from '../../outbox/state';
import { SharedData } from '..';

export const queueTransaction = (sharedData: SharedData, transaction: TransactionOutboxItem) => {
  const newSharedData = { ...sharedData };
  return {
    ...newSharedData,
    outboxState: queueTransactionOutbox(newSharedData.outboxState, transaction),
  };
};
