import {BudgetContext, useBudgetContext} from './budget-context';
import {Web3TorrentClientContext, useWeb3TorrentClientContext} from './w3t-client-context';
import React from 'react';
import {ChannelContext, useChannelContext} from './channel-context';
import {TorrentClientContext, useTorrentClientContext} from './torrent-context';

export const OmniProvider: React.FC = ({children}) => {
  const web3TorrentClientContext = useWeb3TorrentClientContext();
  // TODO: Probably a more elegant way of doing this
  return (
    <Web3TorrentClientContext.Provider value={web3TorrentClientContext}>
      <TorrentClientContext.Provider value={useTorrentClientContext({web3TorrentClientContext})}>
        <ChannelContext.Provider value={useChannelContext({web3TorrentClientContext})}>
          <BudgetContext.Provider value={useBudgetContext({web3TorrentClientContext})}>
            {children}
          </BudgetContext.Provider>
        </ChannelContext.Provider>
      </TorrentClientContext.Provider>
    </Web3TorrentClientContext.Provider>
  );
};
