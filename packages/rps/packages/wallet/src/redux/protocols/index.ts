import { OutboxState, emptyDisplayOutboxState } from '../outbox/state';
import { ChannelState, emptyChannelState } from '../channel-state/state';
import { IndirectFundingState } from './indirect-funding/state';
import { DirectFundingState } from './direct-funding/state';

export interface SharedData {
  channelState: ChannelState;
  outboxState: OutboxState;
}

export const EMPTY_SHARED_DATA: SharedData = {
  channelState: emptyChannelState(),
  outboxState: emptyDisplayOutboxState(),
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
