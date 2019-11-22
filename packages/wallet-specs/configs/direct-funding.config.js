const config = {
  key: 'direct-funding',
  initial: 'arrangeOutcome',
  states: {
    arrangeOutcome: {
      invoke: {
        src: 'ledgerUpdate',
        onDone: 'waiting',
      },
    },
    waiting: {
      on: {
        '*': [
          { target: 'deposit', cond: 'safeToDeposit', actions: 'deposit' },
          { target: 'postFundSetup', cond: 'funded' },
        ],
      },
    },
    deposit: {
      invoke: { src: 'submitTransaction' },
      onDone: 'waiting',
      onError: 'failure',
    },
    postFundSetup: {
      invoke: { src: 'advanceChannel', onDone: 'success', onError: 'failure' },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = { safeToDeposit: x => true, funded: x => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
