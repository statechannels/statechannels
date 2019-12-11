import {ChannelProviderInterface} from '@statechannels/channel-provider';

declare global {
  interface Window {
    channelProvider: ChannelProviderInterface;
  }
}
