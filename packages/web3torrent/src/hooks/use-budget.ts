import {web3TorrentClient} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';
import {DomainBudget} from '@statechannels/client-api-schema';
import {safeUnsubscribeFromFunction} from '../utils/react-utls';
import {logger} from '../logger';

const log = logger.child({module: 'use-budget'});

export function useBudget({ready}: {ready: boolean}) {
  const {paymentChannelClient} = web3TorrentClient;

  const [budget, setBudget] = useState<DomainBudget>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const getAndSetBudget = async () => {
      const budget = await paymentChannelClient.getBudget();

      !cancelled && setBudget(budget);
      !cancelled && setLoading(false);
    };
    if (ready) getAndSetBudget();
    const unsubscribe = paymentChannelClient.channelClient.onBudgetUpdated(getAndSetBudget);

    return () => {
      cancelled = true;
      safeUnsubscribeFromFunction(unsubscribe, log);
    };
  }, [ready, paymentChannelClient]);

  const createBudget = async () => {
    setLoading(true);
    if (paymentChannelClient.enabled) {
      await paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
    } else {
      // enable will call create budget so we don't need to explicitly call it
      await paymentChannelClient.enable();
    }

    setBudget(paymentChannelClient.budgetCache);
    setLoading(false);
  };

  const closeBudget = async () => {
    setLoading(true);
    await paymentChannelClient.closeAndWithdraw();
    setBudget(paymentChannelClient.budgetCache);
    setLoading(false);
  };

  const getBudget = async () => {
    setLoading(true);
    await paymentChannelClient.getBudget();
    setBudget(paymentChannelClient.budgetCache);

    setLoading(false);
  };

  return {budget, loading, createBudget, closeBudget, getBudget};
}
