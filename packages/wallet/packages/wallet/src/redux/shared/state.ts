import { WalletAction } from '../actions';
import { SharedChannelState } from '../channelState/shared/state';
import { OutboxState } from '../outbox/state';
import { FundingState } from '../fundingState/state';

export interface StateWithSideEffects<T> {
  state: T;
  outboxState?: OutboxState;
}

export interface SharedWalletState {
  channelState?: SharedChannelState;
  fundingState?: FundingState;
  outboxState: OutboxState;
  unhandledAction?: WalletAction;
}

export interface LoggedIn extends SharedWalletState {
  uid: string;
}

export interface AdjudicatorKnown extends LoggedIn {
  networkId: number;
  adjudicator: string;
}

export interface TransactionExists {
  transactionHash: string;
}

// creators
export function base<T extends SharedWalletState>(params: T): SharedWalletState {
  const { outboxState, channelState, fundingState } = params;
  return { outboxState, channelState, fundingState };
}

export function loggedIn<T extends LoggedIn>(params: T): LoggedIn {
  return { ...base(params), uid: params.uid };
}

export function adjudicatorKnown<T extends AdjudicatorKnown>(params: T): AdjudicatorKnown {
  const { networkId, adjudicator } = params;
  return { ...loggedIn(params), networkId, adjudicator };
}
