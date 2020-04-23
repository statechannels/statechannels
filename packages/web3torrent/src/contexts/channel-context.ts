import {web3torrent} from '../clients/web3torrent-client';
import {useContext, useEffect} from 'react';

import React from 'react';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const ChannelContext = React.createContext<ReturnType<typeof useChannelContext>>(undefined);

export function useChannelContext({initializationContext}) {
  const {paymentChannelClient} = web3torrent;
  const {initialize, isInitialized} = initializationContext;

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  });

  return {
    channelState: paymentChannelClient.channelCache,
    mySigningAddress: paymentChannelClient.mySigningAddress
  };
}
