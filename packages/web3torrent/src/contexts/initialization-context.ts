import {web3torrent} from '../clients/web3torrent-client';
import {useState} from 'react';
import React from 'react';

export const InitializationContext = React.createContext<
  ReturnType<typeof useInitializationContext>
>(undefined);
export function useInitializationContext() {
  const {paymentChannelClient} = web3torrent;
  const [isInitialized, setInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const initialize = () => {
    if (!isInitialized && !isInitializing) {
      setIsInitializing(true);

      paymentChannelClient.initialize().then(() => {
        setInitialized(true);
        setIsInitializing(false);
      });
    }
  };

  return {initialize, isInitialized, isInitializing};
}
