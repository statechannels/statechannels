import {
  OutboxState,
  EMPTY_OUTBOX_STATE,
  SideEffects,
  queueMessage as queueMessageOutbox,
  queueTransaction as queueTransactionOutbox,
} from './outbox/state';
import {
  ChannelState,
  ChannelStatus,
  setChannel as setChannelInStore,
} from './channel-state/state';
import { Properties } from './utils';
import * as indirectFunding from './protocols/indirect-funding/state';
import { accumulateSideEffects } from './outbox';
import { WalletEvent } from 'magmo-wallet-client';
import { SharedData } from './protocols';
import { TransactionRequest } from 'ethers/providers';

export type WalletState = WaitForLogin | MetaMaskError | Initialized;

// -----------
// State types
// -----------
export const WAIT_FOR_LOGIN = 'INITIALIZING.WAIT_FOR_LOGIN';
export const METAMASK_ERROR = 'INITIALIZING.METAMASK_ERROR';
export const WALLET_INITIALIZED = 'WALLET.INITIALIZED';

// ------
// States
// ------

interface Shared {
  channelState: ChannelState;
  outboxState: OutboxState;
}

export interface WaitForLogin extends Shared {
  type: typeof WAIT_FOR_LOGIN;
}

export interface MetaMaskError extends Shared {
  type: typeof METAMASK_ERROR;
}

export interface Initialized extends Shared {
  type: typeof WALLET_INITIALIZED;
  uid: string;
  processStore: ProcessStore;
  // procedure branches are optional, and exist precisely when that procedure is running
  indirectFunding?: indirectFunding.IndirectFundingState;
}

// TODO: Once these are fleshed out they should be moved to their own file.
export interface ProcessStore {
  [processId: string]: ProcessState;
}
export interface ProcessState {
  processId: string;
  protocolState: any;
  channelsToMonitor: string[];
}

export interface IndirectFundingOngoing extends Initialized {
  indirectFunding: indirectFunding.IndirectFundingState;
}
export function indirectFundingOngoing(state: Initialized): state is IndirectFundingOngoing {
  return state.indirectFunding ? true : false;
}

// ------------
// Constructors
// ------------
export const emptyState: Shared = {
  outboxState: EMPTY_OUTBOX_STATE,
  channelState: { initializedChannels: {}, initializingChannels: {} },
};

function shared(params: Shared): Shared {
  const { outboxState, channelState } = params;
  return { outboxState, channelState };
}

export function waitForLogin(): WaitForLogin {
  return { type: WAIT_FOR_LOGIN, ...emptyState };
}

export function metaMaskError(params: Properties<MetaMaskError>): MetaMaskError {
  return { ...shared(params), type: METAMASK_ERROR };
}
export function initialized(params: Properties<Initialized>): Initialized {
  const { uid, processStore } = params;
  return {
    ...shared(params),
    type: WALLET_INITIALIZED,
    uid,
    processStore,
  };
}

// -------------------
// Getters and setters
// -------------------

export function getChannelStatus(state: WalletState, channelId: string): ChannelStatus {
  return state.channelState.initializedChannels[channelId];
}

export function setSideEffects(state: Initialized, sideEffects: SideEffects): Initialized {
  return { ...state, outboxState: accumulateSideEffects(state.outboxState, sideEffects) };
}

export function setChannel(state: Initialized, channel: ChannelStatus): Initialized {
  return { ...state, channelState: setChannelInStore(state.channelState, channel) };
}

export function queueMessage(state: Initialized, message: WalletEvent): Initialized {
  return { ...state, outboxState: queueMessageOutbox(state.outboxState, message) };
}

export function queueTransaction(
  state: SharedData,
  transaction: TransactionRequest,
  processId: string,
): SharedData {
  return {
    ...state,
    outboxState: queueTransactionOutbox(state.outboxState, transaction, processId),
  };
}

export { indirectFunding };
