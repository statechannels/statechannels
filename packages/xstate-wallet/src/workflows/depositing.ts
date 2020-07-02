import {Machine, MachineConfig, assign, spawn} from 'xstate';
import {Store} from '@statechannels/wallet-core/lib/src/store';
import {map, filter} from 'rxjs/operators';
import {exists} from '@statechannels/wallet-core/lib/src/utils';
import {ChannelChainInfo} from '@statechannels/wallet-core/lib/src/chain';
import {BigNumber} from 'ethers';
import {MachineFactory} from '../utils/workflow-utils';

export type Init = {
  channelId: string;
  depositAt: BigNumber;
  totalAfterDeposit: BigNumber;
  fundedAt: BigNumber;
};

export const config: MachineConfig<Init, any, any> = {
  id: 'depositing',
  initial: 'idle',
  entry: 'assignChainWatcher',
  on: {FUNDED: 'done'},
  states: {
    idle: {on: {SAFE_TO_DEPOSIT: 'submit'}},
    submit: {invoke: {src: 'submitDepositTransaction', onDone: 'idle', onError: 'failure'}},
    done: {type: 'final'},
    failure: {entry: assign<any>({error: () => 'Deposit failed'})}
  }
};
type SafeToDeposit = {type: 'SAFE_TO_DEPOSIT'; currentHoldings: BigNumber};

export const machine: MachineFactory<Init, any> = (store: Store) => {
  const subscribeDepositEvent = (ctx: Init) =>
    store.chain.chainUpdatedFeed(ctx.channelId).pipe(
      map((chainInfo: ChannelChainInfo): 'FUNDED' | SafeToDeposit | undefined => {
        if (chainInfo.amount.gte(ctx.fundedAt)) return 'FUNDED';
        else if (chainInfo.amount.gte(ctx.depositAt))
          return {type: 'SAFE_TO_DEPOSIT', currentHoldings: chainInfo.amount};
        else return;
      }),
      filter(exists)
    );

  const submitDepositTransaction = async (ctx: Init, {currentHoldings}: SafeToDeposit) => {
    const amount = BigNumber.from(ctx.totalAfterDeposit).sub(currentHoldings);
    if (amount.lte(0)) return;

    await store.chain.deposit(ctx.channelId, currentHoldings.toHexString(), amount.toHexString());
  };

  const services = {submitDepositTransaction};
  const actions = {
    assignChainWatcher: assign<Init & {chainWatcher: any}>({
      chainWatcher: (ctx: Init) => spawn(subscribeDepositEvent(ctx))
    })
  } as any;
  const options = {services, actions};
  return Machine(config).withConfig(options);
};
