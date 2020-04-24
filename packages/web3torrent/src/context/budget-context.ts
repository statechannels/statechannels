import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';

import React from 'react';

import WebTorrentPaidStreamingClient from '../library/web3torrent-lib';

export const BudgetContext = React.createContext<ReturnType<typeof useBudgetContext>>(undefined);
interface Props {
  w3tClient: WebTorrentPaidStreamingClient;
}
export function useBudgetContext({w3tClient}: Props) {
  const [loading, setLoading] = useState(true);
  const [doInitialFetch, setDoInitialFetch] = useState(true);
  const [budget, setBudget] = useState(undefined);
  useEffect(() => {
    const getAndSetBudget = async () => {
      const {paymentChannelClient} = w3tClient;

      await paymentChannelClient.getBudget();
      setBudget(paymentChannelClient.budgetCache);
      setLoading(false);
      setDoInitialFetch(false);
    };
    if (doInitialFetch) {
      getAndSetBudget();
    }
  });

  const {paymentChannelClient} = w3tClient;
  const createBudget = async () => {
    setLoading(true);
    await paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
    setBudget(paymentChannelClient.budgetCache);
    setLoading(false);
  };
  const closeBudget = async () => {
    setLoading(true);
    await paymentChannelClient.closeAndWithdraw();
    setBudget(paymentChannelClient.budgetCache);
    setLoading(false);
  };

  return {budget, loading, createBudget, closeBudget};
}
