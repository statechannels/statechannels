import { bigNumberify } from 'ethers/utils';
import { Machine, MachineConfig, InvokeCallback } from 'xstate';

import { FINAL, MachineFactory } from '../..';
import { IStore } from '../../store';
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
    watching: { invoke: { src: 'subscribeDepositEvent' } },
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
  subscribeDepositEvent: (context: Init) => InvokeCallback;
};

type Options = { services: Services };
export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const subscribeDepositEvent = (ctx: Init): InvokeCallback => cb => {
    if (bigNumberify(ctx.depositAt).eq(0)) cb('SAFE_TO_DEPOSIT');

    return store.on('DEPOSITED', async (event: ChainEvent) => {
      if (event.type === 'DEPOSITED' && event.channelId === ctx.channelId) {
        const currentHoldings = bigNumberify(await store.getHoldings(ctx.channelId));

        if (currentHoldings.gte(ctx.fundedAt)) {
          cb('FUNDED');
        } else if (currentHoldings.gte(ctx.depositAt)) {
          cb('SAFE_TO_DEPOSIT');
        } else {
          cb('NOT_SAFE_TO_DEPOSIT');
        }
      }
    });
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
    subscribeDepositEvent,
  };
  const options: Options = { services };
  return Machine(config).withConfig(options, context);
};
