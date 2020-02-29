import {Machine, MachineConfig} from 'xstate';
import {Store} from '../store';
import {map} from 'rxjs/operators';
import {MachineFactory} from '../utils/workflow-utils';
import {Observable} from 'rxjs';
import {HexNumberString} from '../store/types';
import {sub, gte, gt} from '../utils/hex-number-utils';

export type Init = {
  channelId: string;
  depositAt: HexNumberString;
  totalAfterDeposit: HexNumberString;
  fundedAt: HexNumberString;
};

const watcher: MachineConfig<Init, any, any> = {
  initial: 'watching',
  states: {
    watching: {invoke: {src: 'subscribeDepositEvent'}},
    done: {type: 'final'}
  },
  on: {FUNDED: '.done'}
};

export const config: MachineConfig<Init, any, any> = {
  type: 'parallel',
  states: {
    watcher,
    depositor: {
      initial: 'idle',
      on: {FUNDED: '.done'},
      states: {
        idle: {on: {SAFE_TO_DEPOSIT: 'submit'}},
        submit: {
          invoke: {src: 'submitDepositTransaction', onDone: 'done', onError: 'failure'}
        },
        done: {type: 'final'},
        failure: {
          entry: () => {
            throw `Deposit failed`;
          }
        }
      }
    }
  }
};

type Services = {
  submitDepositTransaction: (context: Init) => Promise<void>;
  subscribeDepositEvent: (
    context: Init
  ) => Observable<'FUNDED' | 'SAFE_TO_DEPOSIT' | 'NOT_SAFE_TO_DEPOSIT'>;
};

type Options = {services: Services};
export const machine: MachineFactory<Init, any> = (store: Store, context: Init) => {
  const subscribeDepositEvent = (ctx: Init) => {
    return store.chain.chainUpdatedFeed(ctx.channelId).pipe(
      map((chainInfo): 'FUNDED' | 'SAFE_TO_DEPOSIT' | 'NOT_SAFE_TO_DEPOSIT' => {
        if (gte(chainInfo.amount, ctx.fundedAt)) {
          return 'FUNDED';
        } else if (gte(chainInfo.amount, ctx.depositAt)) {
          return 'SAFE_TO_DEPOSIT';
        } else {
          return 'NOT_SAFE_TO_DEPOSIT';
        }
      })
    );
  };

  const submitDepositTransaction = async (ctx: Init) => {
    const currentHoldings = (await store.chain.getChainInfo(ctx.channelId)).amount;
    const amount = sub(ctx.totalAfterDeposit, currentHoldings);
    if (gt(amount, 0)) {
      await store.chain.deposit(ctx.channelId, currentHoldings, amount);
    }
  };

  const services: Services = {
    submitDepositTransaction,
    subscribeDepositEvent
  };
  const options: Options = {services};
  return Machine(config).withConfig(options, context);
};
