import {SimpleAllocation, Participant, SiteBudget} from './store/types';
import {BigNumber} from 'ethers/utils';
import {ChannelStoreEntry} from './store/channel-store-entry';

export interface JoinChannelEvent {
  type: 'JOIN_CHANNEL';
  channelId: string;
  requestId: number;
  applicationSite: string;
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
  applicationSite: string;
  fundingStrategy: 'Direct' | 'Ledger' | 'Virtual';
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
export interface ApproveBudgetAndFund {
  requestId: number;
  type: 'APPROVE_BUDGET_AND_FUND';
  budget: SiteBudget;
  player: Participant;
  hub: Participant;
}

export interface EnableEthereum {
  requestId: number;
  type: 'ENABLE_ETHEREUM';
}

export interface CloseAndWithdrawRequest {
  requestId: number;
  type: 'CLOSE_AND_WITHDRAW';
  player: Participant;
  hub: Participant;
  site: string;
}

export type AppRequestEvent =
  | PlayerRequestConclude
  | PlayerStateUpdate
  | OpenEvent
  | ChannelUpdated
  | ApproveBudgetAndFund
  | EnableEthereum
  | JoinChannelEvent
  | CloseAndWithdrawRequest;

export type WorkflowEvent = AppRequestEvent;
