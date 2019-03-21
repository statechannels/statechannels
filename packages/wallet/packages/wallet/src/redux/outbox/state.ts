import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';
import { internal } from '../actions';

export interface OutboxState {
  displayOutbox?: DisplayAction;
  messageOutbox?: WalletEvent;
  transactionOutbox?: TransactionRequest;
  actionOutbox?: internal.InternalAction;
}
