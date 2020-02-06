import { bigNumberify } from 'ethers/utils';
import { Machine, MachineConfig } from 'xstate';

import { map } from 'rxjs/operators';

import { FINAL } from '../..';
import { MachineFactory } from '../../machine-utils';
import { ObsoleteStore } from '../../store';
import { ChainEvent } from '../../chain';

export type Init = {
  channelId: string;
  depositAt: string;
  totalAfterDeposit: string;
  fundedAt: string;
};

const watcher: MachineConfig<Init, any, any> = {
  initial: 'watching',
  states: {
    watching: { invoke: { src: 'subscribeToFundingFeed' } },
    done: { type: FINAL },
  },
  on: { FUNDED: '.done' },
};

export const config: MachineConfig<Init, any, any> = {
  type: 'parallel',
  states: {
    watcher,
    depositor: {
      initial: 'idle',
      on: { FUNDED: '.done' },
      states: {
        idle: { on: { SAFE_TO_DEPOSIT: 'submit' } },
        submit: {
          invoke: { src: 'submitDepositTransaction', onDone: 'done', onError: 'failure' },
        },
        done: { type: FINAL },
        failure: {
          entry: () => {
            throw `Deposit failed`;
          },
        },
      },
    },
  },
};

type Services = {
  submitDepositTransaction: (context: Init) => Promise<void>;
  subscribeToFundingFeed: (context: Init, event: any) => any; // Is there an InvokeObservable type?
};

type Options = { services: Services };
export const machine: MachineFactory<Init, any> = (store: ObsoleteStore, context: Init) => {
  const subscribeToFundingFeed = (context: Init, event: any) => {
    store.fundingFeed(context.channelId).pipe(
      map(async (event: ChainEvent) => {
        if (event.type === 'DEPOSITED') {
          const currentHoldings = bigNumberify(await store.getHoldings(context.channelId));
          if (currentHoldings.gte(context.fundedAt)) {
            return 'FUNDED';
          } else if (currentHoldings.gte(context.depositAt)) {
            return 'SAFE_TO_DEPOSIT';
          } else {
            return 'NOT_SAFE_TO_DEPOSIT';
          }
        } else return;
      })
    );
  };
  const submitDepositTransaction = async (ctx: Init) => {
    const currentHoldings = bigNumberify(await store.getHoldings(ctx.channelId));
    const amount = bigNumberify(ctx.totalAfterDeposit).sub(currentHoldings);
    if (amount.gt(0)) {
      await store.deposit(ctx.channelId, currentHoldings.toHexString(), amount.toHexString());
    }
  };

  const services: Services = {
    submitDepositTransaction,
    subscribeToFundingFeed,
  };
  const options: Options = { services };
  return Machine(config).withConfig(options, context);
};
