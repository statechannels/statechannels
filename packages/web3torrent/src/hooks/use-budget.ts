import {web3torrent} from '../clients/web3torrent-client';
import {INITIAL_BUDGET_AMOUNT} from '../constants';
import {useState, useEffect} from 'react';
import {SiteBudget} from '@statechannels/client-api-schema';

export function useBudget() {
  const {paymentChannelClient} = web3torrent;

  const [budget, setBudget] = useState<SiteBudget | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [isInitialized, setInitialized] = useState(false);

  paymentChannelClient.initialize().then(() => setInitialized(true));

  useEffect(() => {
    const getAndSetBudget = async () => {
      const budget = await paymentChannelClient.getBudget();

      setBudget(budget);
      setLoading(false);
    };
    if (isInitialized) {
      getAndSetBudget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

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
