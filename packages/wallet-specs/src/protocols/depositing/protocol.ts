import { bigNumberify } from 'ethers/utils';
import { Machine, MachineConfig, assign, spawn, Action, EventObject } from 'xstate';

import { FINAL, MachineFactory } from '../..';
import { IStore } from '../../store';
import { ChainEvent } from '../../chain';

export type Init = {
  channelId: string;
  depositAt: string;
  totalAfterDeposit: string;
  fundedAt: string;
};

export const config: MachineConfig<Init, any, any> = {
  initial: 'start',
  on: { FUNDED: 'done' },
  states: {
    start: { entry: 'spawnDepositWatcher', on: { '': 'idle' } },
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
};

type SpawnedWatcher = Init & { depositWatcher: any };
type Services = {
  submitDepositTransaction: (context: Init) => Promise<void>;
};
type Actions = { spawnDepositWatcher: Action<SpawnedWatcher, EventObject> };
type Options = { services: Services; actions: Actions };

export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const depositWatcher = cb => {
    return store.on('DEPOSITED', async (event: ChainEvent) => {
      if (event.type === 'DEPOSITED' && event.channelId === context.channelId) {
        const currentHoldings = bigNumberify(await store.getHoldings(context.channelId));

        if (currentHoldings.gte(context.fundedAt)) {
          cb('FUNDED');
        } else if (currentHoldings.gte(context.depositAt)) {
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

  const services: Services = { submitDepositTransaction };
  const actions: Actions = {
    spawnDepositWatcher: assign({ depositWatcher: () => spawn(depositWatcher) }),
  };

  const options: Options = { services, actions };
  return Machine(config).withConfig(options as any, context);
};
