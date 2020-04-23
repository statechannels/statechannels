import {web3torrent} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';
import {useChannelClientContext} from './channel-context';

export type BudgetContext = ReturnType<typeof useBudgetContext>;

export function useBudgetContext({channelClientContext}) {
  const {paymentChannelClient} = web3torrent;

  const [budget, setBudget] = useState<SiteBudget | undefined>(undefined);
  const [fetching, setFetching] = useState(true);

  const {initialize, isInitialized} = useChannelClientContext();
  initialize();
  useEffect(() => {
    const getAndSetBudget = async () => {
      const budget = await paymentChannelClient.getBudget();
      setBudget(budget);
      setFetching(false);
    };

    getAndSetBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const createBudget = async () => {
    setFetching(true);
    await paymentChannelClient.createBudget(INITIAL_BUDGET_AMOUNT);
    setBudget(paymentChannelClient.budgetCache);
    setFetching(false);
  };
  const closeBudget = async () => {
    setFetching(true);
    await paymentChannelClient.closeAndWithdraw();
    setBudget(paymentChannelClient.budgetCache);
    setFetching(false);
  };

  return {budget, fetching, createBudget, closeBudget};
}
