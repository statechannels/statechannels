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

export function getChannel(store: ChannelStore, channelId: string): ChannelState {
  const channel = store[channelId];
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }
  return channel;
}

export function setChannels(store: ChannelStore, channels: ChannelState[]): ChannelStore {
  return channels.reduce((st, ch) => setChannel(st, ch), store);
}
