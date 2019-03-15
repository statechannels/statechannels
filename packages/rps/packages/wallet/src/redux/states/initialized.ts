import { AdjudicatorKnown, adjudicatorKnown } from './shared';
import { SharedChannelState } from './channels/shared';
import { waitForChannel, ChannelState, WaitForChannel } from './channels';

interface BaseInitializingChannel extends AdjudicatorKnown {
  channelState: SharedChannelState;
}

interface BaseInitializedChannel extends AdjudicatorKnown {
  channelState: ChannelState;
}

// stage
export const WALLET_INITIALIZED = 'WALLET.INITIALIZED';

// types
export const WAITING_FOR_CHANNEL_INITIALIZATION = 'WALLET.WAITING_FOR_CHANNEL_INITIALIZATION';
export const INITIALIZING_CHANNEL = 'WALLET.INITIALIZING_CHANNEL';
export const CHANNEL_INITIALIZED = 'WALLET.CHANNEL_INITIALIZED';

export interface WaitingForChannelInitialization extends AdjudicatorKnown {
  stage: typeof WALLET_INITIALIZED;
  type: typeof WAITING_FOR_CHANNEL_INITIALIZATION;
}

export function waitingForChannelInitialization<T extends AdjudicatorKnown>(
  params: T,
): WaitingForChannelInitialization {
  const { outboxState, uid } = params;
  return {
    ...adjudicatorKnown(params),
    type: WAITING_FOR_CHANNEL_INITIALIZATION,
    stage: WALLET_INITIALIZED,
    outboxState,
    uid,
  };
}

export interface InitializingChannel extends BaseInitializingChannel {
  // In the InitializingChannel state, the wallet has reserved a slot for the channel, with
  // the address and private key stored in it.
  // However, no commitment is known, so it is not yet a "ChannelState"
  stage: typeof WALLET_INITIALIZED;
  type: typeof INITIALIZING_CHANNEL;
  channelState: WaitForChannel;
}

export function initializingChannel<T extends BaseInitializingChannel>(
  params: T,
): InitializingChannel {
  const { outboxState, channelState } = params;
  return {
    ...adjudicatorKnown(params),
    type: INITIALIZING_CHANNEL,
    stage: WALLET_INITIALIZED,
    outboxState,
    channelState: waitForChannel(channelState),
  };
}

export interface ChannelInitialized extends BaseInitializingChannel {
  stage: typeof WALLET_INITIALIZED;
  type: typeof CHANNEL_INITIALIZED;
  channelState: ChannelState;
}

export function channelInitialized<T extends BaseInitializedChannel>(
  params: T,
): ChannelInitialized {
  const { outboxState, channelState, unhandledAction } = params;
  return {
    ...adjudicatorKnown(params),
    type: CHANNEL_INITIALIZED,
    stage: WALLET_INITIALIZED,
    outboxState,
    channelState,
    unhandledAction,
  };
}

export type InitializedState =
  | WaitingForChannelInitialization
  | InitializingChannel
  | ChannelInitialized;
