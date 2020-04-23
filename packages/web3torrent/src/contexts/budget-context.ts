import {web3torrent} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';

import React from 'react';

export const BudgetContext = React.createContext<ReturnType<typeof useBudgetContext>>(undefined);

export function useBudgetContext({initializationContext}) {
  const {paymentChannelClient} = web3torrent;

  const [fetching, setFetching] = useState(true);

  const {initialize, isInitialized, isInitializing} = initializationContext;

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  });

  useEffect(() => {
    const getAndSetBudget = async () => {
      await paymentChannelClient.getBudget();
      setFetching(false);
    };
    if (isInitialized) {
      getAndSetBudget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isInitializing]);

  const createBudget = async () => {
    setFetching(true);
    await paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);

    setFetching(false);
  };
  const closeBudget = async () => {
    setFetching(true);
    await paymentChannelClient.closeAndWithdraw();

    setFetching(false);
  };

  return {budget: paymentChannelClient.budgetCache, fetching, createBudget, closeBudget};
}
