import {web3torrent} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';
import {useChannelClient} from './use-web3-torrent-client';

export function useBudget() {
  const {paymentChannelClient} = web3torrent;
  const [budget, setBudget] = useState<SiteBudget | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const {initialize, isInitialized} = useChannelClient();
  initialize();
  useEffect(() => {
    const getAndSetBudget = async () => {
      const budget = await paymentChannelClient.getBudget();
      console.log(budget);
      setBudget(budget);
      setLoading(false);
    };

    getAndSetBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // useEffect(async () => {
  //   const budget = await paymentChannelClient.getBudget();
  //   setBudget(budget);
  //   setLoading(false);
  //   console.log('test');
  //   return () => ({});
  // });

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
