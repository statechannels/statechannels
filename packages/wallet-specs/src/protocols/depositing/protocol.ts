import { FINAL } from '../..';

type Guards = {
  safeToDeposit: (x) => boolean;
  funded: (x) => boolean;
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
    deposit: {
      invoke: { src: 'depositService' },
      onDone: 'waiting',
      onError: 'failure',
    },
    done: { type: FINAL },
  },
  onDone: 'updatePostFundOutcome',
};
