import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';

import React from 'react';
import {Web3TorrentClientContextInterface} from './w3t-client-context';

export const BudgetContext = React.createContext<ReturnType<typeof useBudgetContext>>(undefined);
interface Props {
  web3TorrentClientContext: Web3TorrentClientContextInterface;
}
export function useBudgetContext({web3TorrentClientContext}: Props) {
  const [loading, setLoading] = useState(true);

  const {initialize, initializationStatus} = web3TorrentClientContext;

  useEffect(() => {
    if (initializationStatus === 'Not Initialized') {
      initialize();
    }
  });

  useEffect(() => {
    const getAndSetBudget = async () => {
      const {paymentChannelClient} = web3TorrentClientContext.getContext();
      await paymentChannelClient.getBudget();
      setLoading(false);
    };
    if (initializationStatus === 'Initialized') {
      getAndSetBudget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializationStatus]);

  if (initializationStatus !== 'Initialized') {
    return {budget: undefined, loading, createBudget: undefined, closeBudget: undefined};
  } else {
    return constructContext(web3TorrentClientContext, loading, setLoading);
  }
}

function constructContext(web3TorrentClientContext, loading, setLoading) {
  const {paymentChannelClient} = web3TorrentClientContext.getContext();
  const createBudget = async () => {
    setLoading(true);
    await paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);

    setLoading(false);
  };
  const closeBudget = async () => {
    setLoading(true);
    await paymentChannelClient.closeAndWithdraw();

    setLoading(false);
  };

  return {budget: paymentChannelClient.budgetCache, loading, createBudget, closeBudget};
}
