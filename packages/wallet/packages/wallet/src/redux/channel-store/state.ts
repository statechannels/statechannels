import { ChannelState } from './channel-state';

export interface ChannelStore {
  [channelId: string]: ChannelState;
}

export function emptyChannelStore(): ChannelStore {
  return {};
}

// -------------------
// Getters and setters
// -------------------

export function setChannel(store: ChannelStore, channel: ChannelState): ChannelStore {
  const channelId = channel.channelId;
  return { ...store, [channelId]: channel };
}

export function getChannel(store: ChannelStore, channelId: string): ChannelState | undefined {
  return store[channelId];
}
