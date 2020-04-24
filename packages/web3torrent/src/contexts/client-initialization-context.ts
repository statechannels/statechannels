import {useState} from 'react';
import React from 'react';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

export type InitializationStatus = 'Not Initialized' | 'Initialized' | 'Initializing';

export interface ClientInitializationContextInterface {
  initialize: () => void;
  initializationStatus: InitializationStatus;
}

export const ClientInitializationContext = React.createContext<
  ClientInitializationContextInterface
>(undefined);

interface Props {
  w3tClient: WebTorrentPaidStreamingClient;
}
export function useClientInitializationContext({
  w3tClient
}: Props): ClientInitializationContextInterface | undefined {
  const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>(
    'Not Initialized'
  );

  const initialize = () => {
    if (initializationStatus === 'Not Initialized') {
      setInitializationStatus('Initializing');

      w3tClient.paymentChannelClient.initialize().then(() => {
        setInitializationStatus('Initialized');
      });
    }
  };

  return {initialize, initializationStatus};
}
