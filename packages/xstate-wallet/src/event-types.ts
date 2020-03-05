import {SimpleAllocation, Participant} from './store/types';
import {BigNumber} from 'ethers/utils';
import {ChannelStoreEntry} from './store/memory-channel-storage';

export interface JoinChannelEvent {
  type: 'JOIN_CHANNEL';
  channelId: string;
  requestId: number;
}
// Events
export type OpenEvent = CreateChannelEvent | JoinChannelEvent;

export interface CreateChannelEvent {
  type: 'CREATE_CHANNEL';
  participants: Participant[];
  outcome: SimpleAllocation;
  appDefinition: string;
  appData: string;
  challengeDuration: BigNumber;
  chainId: string;
  requestId: number;
}

export interface ChannelUpdated {
  type: 'CHANNEL_UPDATED';
  storeEntry: ChannelStoreEntry;
  requestId: number;
}

export interface PlayerStateUpdate {
  type: 'PLAYER_STATE_UPDATE';
  requestId: number;
  outcome: SimpleAllocation;
  channelId: string;
  appData: string;
}
export interface PlayerRequestConclude {
  requestId: number;
  type: 'PLAYER_REQUEST_CONCLUDE';
  channelId: string;
}

export type AppRequestEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | OpenEvent
  | ChannelUpdated
  | JoinChannelEvent;

export type WorkflowEvent = AppRequestEvent;
