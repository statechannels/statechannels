import {web3TorrentClient} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';
import {DomainBudget} from '@statechannels/client-api-schema';
import {from, noop, Subscription} from 'rxjs';
import {safeUnsubscribe, safeUnsubscribeFromFunction} from '../utils/react-utls';
import {logger} from '../logger';

const log = logger.child({module: 'use-budget'});

export function useBudget({ready}: {ready: boolean}) {
  const {paymentChannelClient} = web3TorrentClient;

  const [budget, setBudget] = useState<DomainBudget>(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const setBudgetUI = budget => {
      setBudget(budget);
      setLoading(false);
    };
    const getBudget = () => from(paymentChannelClient.getBudget());

    let getBudgetSubscription: Subscription;
    if (ready) {
      getBudgetSubscription = getBudget().subscribe(setBudgetUI);
    }
    const onBudgetUpdatedSubscription = paymentChannelClient.channelClient.onBudgetUpdated(() =>
      getBudget().subscribe(setBudgetUI)
    );

    // Mostly works.
    // Cleanup is not properly done for the following case:
    // 1. onBudgetUpdated event arrives.
    // 2. getBudget().subscribe(setBudget) is invoked.
    // The operation from step 2 is not properly cleaned up.
    // To fix this issue, onBudgetUpdated would need to return an observable instead of a subscription.
    return () => {
      safeUnsubscribe(getBudgetSubscription, log)();
      safeUnsubscribeFromFunction(onBudgetUpdatedSubscription, log)();
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
