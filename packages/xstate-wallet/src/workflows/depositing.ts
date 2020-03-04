import {bigNumberify, BigNumber} from 'ethers/utils';
import {Machine, MachineConfig} from 'xstate';
import {Store} from '../store';
import {map} from 'rxjs/operators';
import {MachineFactory} from '../utils/workflow-utils';
import {Observable} from 'rxjs';

export type Init = {
  channelId: string;
  depositAt: BigNumber;
  totalAfterDeposit: BigNumber;
  fundedAt: BigNumber;
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
  id: 'depositing',
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
        if (chainInfo.amount.gte(ctx.fundedAt)) return 'FUNDED';
        else if (chainInfo.amount.gte(ctx.depositAt)) return 'SAFE_TO_DEPOSIT';
        else return 'NOT_SAFE_TO_DEPOSIT';
      })
    );
  };

  const submitDepositTransaction = async (ctx: Init) => {
    const currentHoldings = (await store.chain.getChainInfo(ctx.channelId)).amount;
    const amount = bigNumberify(ctx.totalAfterDeposit).sub(currentHoldings);
    if (amount.gt(0)) {
      await store.chain.deposit(ctx.channelId, currentHoldings.toHexString(), amount.toHexString());
    }
  };

  const services: Services = {
    submitDepositTransaction,
    subscribeDepositEvent
  };
  const options: Options = {services};
  return Machine(config).withConfig(options, context);
};
