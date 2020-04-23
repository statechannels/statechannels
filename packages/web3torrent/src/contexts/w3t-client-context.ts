import {useState} from 'react';
import React from 'react';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';
import {defaultTrackers} from '../constants';
import {PaymentChannelClient} from '../clients/payment-channel-client';
import {ChannelClient} from '@statechannels/channel-client';

export type InitializationStatus = 'Not Initialized' | 'Initialized' | 'Initializing';

export interface Web3TorrentClientContextInterface {
  initialize: () => void;
  initializationStatus: InitializationStatus;
  getContext: () => WebTorrentPaidStreamingClient;
}

export const Web3TorrentClientContext = React.createContext<Web3TorrentClientContextInterface>(
  undefined
);

export function useWeb3TorrentClientContext(): Web3TorrentClientContextInterface | undefined {
  const [web3TorrentContext, setWeb3TorrentClient] = useState<
    WebTorrentPaidStreamingClient | undefined
  >(undefined);

  const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>(
    'Not Initialized'
  );

  const initialize = () => {
    if (initializationStatus === 'Not Initialized') {
      setInitializationStatus('Initializing');
      // All client initialization logic lives here
      const paymentChannelClient = new PaymentChannelClient(
        new ChannelClient(window.channelProvider)
      );

      setWeb3TorrentClient(
        new WebTorrentPaidStreamingClient({
          paymentChannelClient,
          tracker: {announce: defaultTrackers}
        })
      );

      paymentChannelClient.initialize().then(() => {
        setInitializationStatus('Initialized');
      });
    }
  };
  // getContext should only be used by other contexts
  // TODO: Is there a good way of enforcing that?
  const getContext = () => web3TorrentContext;
  return {initialize, initializationStatus, getContext};
}
