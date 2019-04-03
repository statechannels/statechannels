import { OutboxState, EMPTY_OUTBOX_STATE } from './outbox/state';
import { FundingState, EMPTY_FUNDING_STATE } from './fundingState/state';
import { ChannelState, ChannelStatus } from './channelState/state';
import { Properties } from './utils';
import { IndirectFundingState } from './indirectFunding/state';

export type WalletState = WaitForLogin | WaitForAdjudicator | MetaMaskError | Initialized;

// -----------
// State types
// -----------
export const WAIT_FOR_LOGIN = 'INITIALIZING.WAIT_FOR_LOGIN';
export const METAMASK_ERROR = 'INITIALIZING.METAMASK_ERROR';
export const WAIT_FOR_ADJUDICATOR = 'INITIALIZING.WAIT_FOR_ADJUDICATOR';
export const WALLET_INITIALIZED = 'WALLET.INITIALIZED';

// ------
// States
// ------
export interface WaitForLogin {
  type: typeof WAIT_FOR_LOGIN;
  channelState: ChannelState;
  fundingState: FundingState;
  outboxState: OutboxState;
}

export interface MetaMaskError {
  type: typeof METAMASK_ERROR;
  channelState: ChannelState;
  fundingState: FundingState;
  outboxState: OutboxState;
}

export interface WaitForAdjudicator {
  type: typeof WAIT_FOR_ADJUDICATOR;
  channelState: ChannelState;
  fundingState: FundingState;
  outboxState: OutboxState;
  uid: string;
}

export interface Initialized {
  type: typeof WALLET_INITIALIZED;
  channelState: ChannelState;
  fundingState: FundingState;

  outboxState: OutboxState;
  uid: string;
  networkId: number;
  adjudicator: string;

  // procedure branches are optional, and exist precisely when that procedure is running
  indirectFunding?: IndirectFundingState;
}

// ------------
// Constructors
// ------------
export const emptyState = {
  outboxState: EMPTY_OUTBOX_STATE,
  fundingState: EMPTY_FUNDING_STATE,
  channelState: { initializedChannels: {}, initializingChannels: {} },
};

export function waitForLogin(): WaitForLogin {
  return { type: WAIT_FOR_LOGIN, ...emptyState };
}

export function metaMaskError(params: Properties<MetaMaskError>): MetaMaskError {
  const { outboxState, fundingState, channelState } = params;
  return { type: METAMASK_ERROR, outboxState, fundingState, channelState };
}

export function waitForAdjudicator(params: Properties<WaitForAdjudicator>): WaitForAdjudicator {
  const { outboxState, fundingState, channelState, uid } = params;
  return { type: WAIT_FOR_ADJUDICATOR, outboxState, fundingState, channelState, uid };
}

export function initialized(params: Properties<Initialized>): Initialized {
  const { outboxState, fundingState, channelState, uid, networkId, adjudicator } = params;
  return {
    type: WALLET_INITIALIZED,
    channelState,
    fundingState,
    outboxState,
    uid,
    networkId,
    adjudicator,
  };
}

export function getChannelStatus(state: WalletState, channelId: string): ChannelStatus {
  return state.channelState.initializedChannels[channelId];
}
