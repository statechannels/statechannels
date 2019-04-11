import { OutboxState } from '../outbox/state';
import { ChannelState } from '../channel-state/state';
import { IndirectFundingState } from '../indirect-funding/state';

export interface SharedData {
  channelState: ChannelState;
  outboxState: OutboxState;
}

export type ProtocolState = IndirectFundingState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}
