import { FINAL } from '../..';

export type Init = {
  channelId: string;
  depositAt: string;
  depositTo: string;
};

export const config = {
  initial: 'waiting',
  states: {
    waiting: {
      on: {
        '*': [
          { target: 'deposit', cond: 'safeToDeposit', actions: 'deposit' },
          { target: 'done', cond: 'funded' },
        ],
      },
    },
    submitting: {
      invoke: { src: 'submitDepositTransaction' },
      onDone: 'waiting',
      onError: 'failure',
    },
    done: { type: FINAL },
    failure: {
      entry: () => {
        throw 'Deposit failed ';
      },
    },
  },
  onDone: 'updatePostFundOutcome',
};
