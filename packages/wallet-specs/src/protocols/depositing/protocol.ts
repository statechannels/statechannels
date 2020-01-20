import { FINAL, MachineFactory, add } from '../..';
import { IStore } from '../../store';
import { bigNumberify } from 'ethers/utils';
import { Machine, send, assign, MachineConfig, sendParent } from 'xstate';

export type Init = {
  channelId: string;
  depositAt: string;
  totalAfterDeposit: string;
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
    watching: {
      invoke: {
        src: 'subscribeDepositEvent',
        onDone: {
          actions: send(DepositingEventType.DEPOSITED, { to: MachineId.Depositor }),
          target: 'watching',
        },
      },
      on: {
        STOP: { target: 'done' },
      },
    },
    done: {
      type: FINAL,
    },
  },
};

export const config: MachineConfig<Init | CurrentHoldingsSet, any, any> = {
  id: MachineId.Parent,
  type: 'parallel',

  states: {
    watcher,
    depositor: {
      initial: 'getCurrentHoldings',

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
          on: {
            DEPOSITED: { target: 'getCurrentHoldings' },
          },
        },
        checkHoldings: {
          on: {
            DEPOSITED: { target: 'getCurrentHoldings' },
            '': [
              {
                target: 'done',
                cond: 'funded',
                actions: send(DepositingEventType.STOP),
              },
              { target: 'submitting', cond: 'safeToDeposit' },
              { target: 'waiting' },
            ],
          },
        },
        waiting: {
          on: {
            '*': 'getCurrentHoldings',
          },
        },
        submitting: {
          invoke: { src: 'submitDepositTransaction', onDone: 'waiting', onError: 'failure' },
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
  funded: (context: Init) => boolean;
};
type Options = { services: Services; guards: Guards };
export const machine: MachineFactory<Init, any> = (store: IStore, context: Init) => {
  const subscribeDepositEvent = (context: Init) => callback => {
    return store.on('DEPOSITED', event => {
      if (event.type === 'DEPOSITED' && event.channelId === context.channelId) {
        callback('DEPOSITED');
      }
    });
  };
  const submitDepositTransaction = async (context: Init) => {
    const currentHoldings = await store.getHoldings(context.channelId);
    const amount = bigNumberify(context.totalAfterDeposit).sub(currentHoldings);
    if (amount.gt(0)) {
      await store.deposit(context.channelId, amount.toHexString(), currentHoldings);
    }
  };
  const safeToDeposit = (context: CurrentHoldingsSet) => {
    return bigNumberify(context.currentHoldings).gte(context.depositAt);
  };
  const funded = (context: CurrentHoldingsSet) => {
    return bigNumberify(context.currentHoldings).gte(context.totalAfterDeposit);
  };

  const getHoldings = (context: Init) => {
    return store.getHoldings(context.channelId);
  };

  const services: Services = {
    submitDepositTransaction,
    getHoldings,
    subscribeDepositEvent,
  };
  const guards: Guards = { safeToDeposit, funded };
  const options: Options = { services, guards };
  return Machine(config).withConfig(options, context);
};
