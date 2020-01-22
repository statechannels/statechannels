import { bigNumberify } from 'ethers/utils';
import { Machine, assign, MachineConfig } from 'xstate';

import { FINAL, MachineFactory } from '../..';
import { IStore } from '../../store';
import { ChainEvent } from '../../chain';

export type Init = {
  channelId: string;
  depositAt: string;
  totalAfterDeposit: string;
  fundedAt: string;
};

enum DepositingEventType {
  DEPOSITED = 'DEPOSITED',
  STOP = 'STOP',
}
enum MachineId {
  Parent = 'depositing',
  ChainWatcher = 'watcher',
  Depositor = 'depositor',
}

export type CurrentHoldingsSet = Init & { currentHoldings: string };
const watcher: MachineConfig<Init | CurrentHoldingsSet, any, any> = {
  id: MachineId.ChainWatcher,
  initial: 'watching',
  states: {
    watching: { invoke: { src: 'subscribeDepositEvent' } },
    done: { type: FINAL },
  },
  on: { FUNDED: '.done' },
};

export const config: MachineConfig<Init | CurrentHoldingsSet, any, any> = {
  id: MachineId.Parent,
  type: 'parallel',
  states: {
    watcher,
    depositor: {
      initial: 'getCurrentHoldings',
      on: {
        DEPOSITED: '.getCurrentHoldings',
        FUNDED: { target: '.done' },
      },
      states: {
        getCurrentHoldings: {
          invoke: {
            src: 'getHoldings',
            onDone: {
              target: 'checkHoldings',
              actions: assign((context: Init, event: any) => {
                return {
                  ...context,
                  currentHoldings: event.data,
                };
              }),
            },
          },
        },
        checkHoldings: {
          on: {
            '': [{ target: 'submitting', cond: 'safeToDeposit' }, { target: 'waiting' }],
          },
        },
        waiting: {},
        submitting: {
          invoke: { src: 'submitDepositTransaction', onDone: 'done', onError: 'failure' },
        },
        done: { type: FINAL },
        failure: {
          entry: () => {
            throw 'Deposit failed ';
          },
        },
      },
    },
  },
};

type Services = {
  submitDepositTransaction: (context: CurrentHoldingsSet) => Promise<void>;
  getHoldings: (context: Init) => Promise<string>;
  subscribeDepositEvent: (context: Init) => (callback) => () => void;
};

type Guards = {
  safeToDeposit: (context: Init) => boolean;
};
type Options = { services: Services; guards: Guards };
export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const subscribeDepositEvent = (context: Init) => callback => {
    return store.on('DEPOSITED', (event: ChainEvent) => {
      if (event.type === 'DEPOSITED' && event.channelId === context.channelId) {
        if (bigNumberify(event.total).gte(context.fundedAt)) {
          callback('FUNDED');
        } else {
          callback(event);
        }
      }
    });
  };

  const submitDepositTransaction = async (context: Init) => {
    const currentHoldings = await store.getHoldings(context.channelId);
    const amount = bigNumberify(context.totalAfterDeposit).sub(currentHoldings);
    if (amount.gt(0)) {
      await store.deposit(context.channelId, currentHoldings, amount.toHexString());
    }
  };

  const safeToDeposit = (context: CurrentHoldingsSet) => {
    return bigNumberify(context.currentHoldings).gte(context.depositAt);
  };

  const getHoldings = async (context: Init) => {
    return store.getHoldings(context.channelId);
  };

  const services: Services = {
    submitDepositTransaction,
    getHoldings,
    subscribeDepositEvent,
  };
  const guards: Guards = { safeToDeposit };
  const options: Options = { services, guards };
  return Machine(config).withConfig(options, context);
};
