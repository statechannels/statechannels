import {createContext} from 'react';
import {BudgetContext, useBudgetContext} from './budget-context';
import {ChannelClientContext, useChannelClientContext} from './channel-context';
import React from 'react';
export const GlobalContext = createContext<{
  budgets: BudgetContext;
  channelClient: ChannelClientContext;
}>(undefined);

export const GlobalProvider: React.FC = ({children}) => {
  const channelClientContext = useChannelClientContext();
  return (
    <GlobalContext.Provider
      value={{
        channelClient: channelClientContext,
        budgets: useBudgetContext({channelClientContext})
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
