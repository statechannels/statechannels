import { OutboxState, EMPTY_OUTBOX_STATE } from '../outbox/state';
import { ChannelState, EMPTY_CHANNEL_STATE } from '../channel-state/state';
import { IndirectFundingState } from '../indirect-funding/state';
import { DirectFundingState } from './direct-funding/state';

export interface SharedData {
  channelState: ChannelState;
  outboxState: OutboxState;
}

export const EMPTY_SHARED_DATA: SharedData = {
  channelState: EMPTY_CHANNEL_STATE,
  outboxState: EMPTY_OUTBOX_STATE,
};

export type ProtocolState = IndirectFundingState | DirectFundingState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}
