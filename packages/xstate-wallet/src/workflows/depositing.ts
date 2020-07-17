import {Machine, MachineConfig, assign, spawn} from 'xstate';
import {map, filter} from 'rxjs/operators';
import {exists, BN, Uint256} from '@statechannels/wallet-core';
import {ChannelChainInfo} from '../chain';
import {Store} from '../store';
import {MachineFactory} from '../utils/workflow-utils';

export type Init = {
  channelId: string;
  depositAt: Uint256;
  totalAfterDeposit: Uint256;
  fundedAt: Uint256;
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
type SafeToDeposit = {type: 'SAFE_TO_DEPOSIT'; currentHoldings: Uint256};

export const machine: MachineFactory<Init, any> = (store: Store) => {
  const subscribeDepositEvent = (ctx: Init) =>
    store.chain.chainUpdatedFeed(ctx.channelId).pipe(
      map((chainInfo: ChannelChainInfo): 'FUNDED' | SafeToDeposit | undefined => {
        if (BN.gte(chainInfo.amount, ctx.fundedAt)) return 'FUNDED';
        else if (BN.gte(chainInfo.amount, ctx.depositAt))
          return {type: 'SAFE_TO_DEPOSIT', currentHoldings: chainInfo.amount};
        else return;
      }),
      filter(exists)
    );

  const submitDepositTransaction = async (ctx: Init, {currentHoldings}: SafeToDeposit) => {
    const amount = BN.sub(ctx.totalAfterDeposit, currentHoldings);
    if (BN.lte(amount, 0)) return;

    await store.chain.deposit(ctx.channelId, BN.from(currentHoldings), amount);
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
