import {useEffect} from 'react';

import React from 'react';
import {Web3TorrentClientContextInterface} from './w3t-client-context';
import {ChannelState} from '../clients/payment-channel-client';

export interface ChannelContextInterface {
  channelState: Record<string, ChannelState>;
  mySigningAddress: string;
  challengeChannel: (channelId: string) => Promise<ChannelState>;
}
export const ChannelContext = React.createContext<ChannelContextInterface>(undefined);
interface Props {
  web3TorrentClientContext: Web3TorrentClientContextInterface;
}
export function useChannelContext({
  web3TorrentClientContext
}: Props): ChannelContextInterface | undefined {
  const {initialize, initializationStatus, getContext} = web3TorrentClientContext;

  useEffect(() => {
    if (initializationStatus === 'Not Initialized') {
      initialize();
    }
  });
  if (initializationStatus !== 'Initialized') {
    return undefined;
  }

  const {paymentChannelClient} = getContext();
  return {
    channelState: paymentChannelClient.channelCache,
    mySigningAddress: paymentChannelClient.mySigningAddress,
    challengeChannel: paymentChannelClient.challengeChannel
  };
}
