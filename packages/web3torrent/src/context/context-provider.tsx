import {BudgetContext, useBudgetContext} from './budget-context';
import {
  useClientInitializationContext,
  ClientInitializationContext
} from './client-initialization-context';
import React from 'react';
import {ChannelContext, useChannelContext} from './channel-context';
import {TorrentClientContext, useTorrentClientContext} from './torrent-client-context';
import {ChannelClient} from '@statechannels/channel-client';
import {PaymentChannelClient} from '../clients/payment-channel-client';
import {defaultTrackers} from '../constants';
import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

export const ContextProvider: React.FC = ({children}) => {
  const paymentChannelClient = new PaymentChannelClient(new ChannelClient(window.channelProvider));
  const w3tClient = new WebTorrentPaidStreamingClient({
    paymentChannelClient,
    tracker: {announce: defaultTrackers}
  });

  const initializationContext = useClientInitializationContext({w3tClient});

  const channelContext = useChannelContext({w3tClient});
  const budgetContext = useBudgetContext({w3tClient, initializationContext});
  const torrentClientContext = useTorrentClientContext({w3tClient, budgetContext});
  return (
    <ClientInitializationContext.Provider value={initializationContext}>
      <TorrentClientContext.Provider value={torrentClientContext}>
        <ChannelContext.Provider value={channelContext}>
          <BudgetContext.Provider value={budgetContext}>{children}</BudgetContext.Provider>
        </ChannelContext.Provider>
      </TorrentClientContext.Provider>
    </ClientInitializationContext.Provider>
  );
};
