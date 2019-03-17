import { TransactionRequest } from 'ethers/providers';
import { WalletEvent, DisplayAction } from 'magmo-wallet-client';

export interface OutboxState {
  displayOutbox?: DisplayAction;
  messageOutbox?: WalletEvent;
  transactionOutbox?: TransactionRequest;
}
