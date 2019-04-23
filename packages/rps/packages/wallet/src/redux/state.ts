import {
  OutboxState,
  emptyDisplayOutboxState,
  SideEffects,
  queueMessage as queueMessageOutbox,
  queueTransaction as queueTransactionOutbox,
} from './outbox/state';
import {
  ChannelState,
  ChannelStatus,
  setChannel as setChannelInStore,
  emptyChannelState,
} from './channel-state/state';
import { Properties } from './utils';
import * as indirectFunding from './protocols/indirect-funding/state';
import { accumulateSideEffects } from './outbox';
import { WalletEvent } from 'magmo-wallet-client';
import { TransactionRequest } from 'ethers/providers';
import { WalletProtocol } from './types';
import { AdjudicatorState } from './adjudicator-state/state';

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

export interface SharedData {
  channelState: ChannelState;
  outboxState: OutboxState;
  adjudicatorState: AdjudicatorState;
  fundingState: FundingState;
}

export interface WaitForLogin extends SharedData {
  type: typeof WAIT_FOR_LOGIN;
}

export interface MetaMaskError extends SharedData {
  type: typeof METAMASK_ERROR;
}

export interface Initialized extends SharedData {
  type: typeof WALLET_INITIALIZED;
  uid: string;
  processStore: ProcessStore;

  // TODO: This is obsolete now that we have ProcessStore
  // This should be deleted once we clean up the code still using this
  indirectFunding?: indirectFunding.IndirectFundingState;
}

// TODO: Once these are fleshed out they should be moved to their own file.
export interface ProcessStore {
  [processId: string]: ProcessState;
}
export interface ProcessState {
  processId: string;
  protocol: WalletProtocol;
  protocolState: any;
  channelsToMonitor: string[];
}

export interface FundingState {
  [channelId: string]: ChannelFundingState;
}

export interface ChannelFundingState {
  directlyFunded: boolean;
  fundingChannel?: string;
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
export const EMPTY_SHARED_DATA: SharedData = {
  outboxState: emptyDisplayOutboxState(),
  channelState: emptyChannelState(),
  adjudicatorState: {},
  fundingState: {},
};

export function sharedData(params: SharedData): SharedData {
  const { outboxState, channelState, adjudicatorState, fundingState } = params;
  return { outboxState, channelState, adjudicatorState, fundingState };
}

export function waitForLogin(): WaitForLogin {
  return { type: WAIT_FOR_LOGIN, ...EMPTY_SHARED_DATA };
}

export function metaMaskError(params: Properties<MetaMaskError>): MetaMaskError {
  return { ...sharedData(params), type: METAMASK_ERROR };
}
export function initialized(params: Properties<Initialized>): Initialized {
  const { uid, processStore } = params;
  return {
    ...sharedData(params),
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

export function setChannel(state: SharedData, channel: ChannelStatus): SharedData {
  return { ...state, channelState: setChannelInStore(state.channelState, channel) };
}

export function getChannel(state: SharedData, channelId: string): ChannelStatus | undefined {
  return state.channelState.initializedChannels[channelId];
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
