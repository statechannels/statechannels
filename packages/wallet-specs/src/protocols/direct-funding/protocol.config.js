const config = {
  key: 'direct-funding',
  initial: 'updatePrefundOutcome',
  states: {
    updatePrefundOutcome: {
      on: { '': { target: 'waiting', cond: 'noUpdateNeeded' } },
      invoke: {
        src: 'ledgerUpdate',
        data: 'preFundLedgerUpdateParams',
        onDone: 'waiting',
      },
    },
    waiting: {
      on: {
        '*': [
          { target: 'deposit', cond: 'safeToDeposit', actions: 'deposit' },
          { target: 'updatePostFundOutcome', cond: 'funded' },
        ],
      },
    },
    deposit: {
      invoke: { src: 'submitTransaction' },
      onDone: 'waiting',
      onError: 'failure',
    },
    updatePostFundOutcome: {
      invoke: {
        src: 'ledgerUpdate',
        data: 'postFundLedgerUpdateParams',
        onDone: 'success',
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = {
  noUpdateNeeded: function(x) {
    return true;
  },
  safeToDeposit: function(x) {
    return true;
  },
  funded: function(x) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
