import { OutboxState, SideEffects, EMPTY_OUTBOX_STATE } from '../outbox/state';
import { FundingState, waitForFundingRequest } from '../fundingState/state';
import { ChannelState } from '../channelState/state';

export interface StateWithSideEffects<T> {
  state: T;
  sideEffects?: SideEffects;
}

export interface SharedWalletState {
  channelState: ChannelState;
  fundingState: FundingState;
  outboxState: OutboxState;
}

export const emptyState: SharedWalletState = {
  outboxState: EMPTY_OUTBOX_STATE,
  fundingState: waitForFundingRequest(),
  channelState: { initializedChannels: {}, initializingChannels: {} },
};

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
  const { networkId, adjudicator, channelState } = params;
  return { ...loggedIn(params), networkId, adjudicator, channelState };
}
