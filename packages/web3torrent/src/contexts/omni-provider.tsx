import {BudgetContext, useBudgetContext} from './budget-context';
import {InitializationContext, useInitializationContext} from './initialization-context';
import React from 'react';
import {ChannelContext, useChannelContext} from './channel-context';
import {TorrentContext, useTorrentContext} from './torrent-context';

export const OmniProvider: React.FC = ({children}) => {
  const initializationContext = useInitializationContext();
  // TODO: Probably a more elegant way of doing this
  return (
    <InitializationContext.Provider value={initializationContext}>
      <TorrentContext.Provider value={useTorrentContext({initializationContext})}>
        <ChannelContext.Provider value={useChannelContext({initializationContext})}>
          <BudgetContext.Provider value={useBudgetContext({initializationContext})}>
            {children}
          </BudgetContext.Provider>
        </ChannelContext.Provider>
      </TorrentContext.Provider>
    </InitializationContext.Provider>
  );
};
