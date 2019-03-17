import { WalletAction } from '../actions';
import { SharedChannelState } from '../channelState/shared/state';
import { OutboxState } from '../outbox/state';

export interface NextChannelState<T extends SharedChannelState> {
  channelState: T;
  unhandledAction?: WalletAction;
  outboxState?: OutboxState;
}

export interface SharedWalletState {
  channelState?: SharedChannelState;
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

// creators
export function base<T extends SharedWalletState>(params: T): SharedWalletState {
  const { outboxState, channelState } = params;
  return { outboxState, channelState };
}

export function loggedIn<T extends LoggedIn>(params: T): LoggedIn {
  return { ...base(params), uid: params.uid };
}

export function adjudicatorKnown<T extends AdjudicatorKnown>(params: T): AdjudicatorKnown {
  const { networkId, adjudicator } = params;
  return { ...loggedIn(params), networkId, adjudicator };
}
