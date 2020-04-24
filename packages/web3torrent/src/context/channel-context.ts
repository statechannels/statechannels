import React from 'react';

import {ChannelState} from '../clients/payment-channel-client';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

export interface ChannelContextInterface {
  channelState: Record<string, ChannelState>;
  mySigningAddress: string;
  challengeChannel: (channelId: string) => Promise<ChannelState>;
}
export const ChannelContext = React.createContext<ChannelContextInterface>(undefined);
interface Props {
  w3tClient: WebTorrentPaidStreamingClient;
}
export function useChannelContext({w3tClient}: Props): ChannelContextInterface | undefined {
  const {paymentChannelClient} = w3tClient;
  return {
    channelState: paymentChannelClient.channelCache,
    mySigningAddress: paymentChannelClient.mySigningAddress,
    challengeChannel: paymentChannelClient.challengeChannel
  };
}
