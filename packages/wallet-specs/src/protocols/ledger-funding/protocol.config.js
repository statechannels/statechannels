const config = {
  key: 'ledger-funding',
  initial: 'waitForChannel',
  states: {
    lookForExistingChannel: {
      invoke: { src: 'findLedgerChannelId' },
      on: {
        CHANNEL_FOUND: {
          target: 'fundLedger',
          actions: 'assignLedgerChannelId',
        },
        CHANNEL_NOT_FOUND: 'createNewChannel',
      },
    },
    createNewChannel: {
      invoke: { src: 'createNullChannel', data: 'createNullChannelArgs' },
      onDone: 'fundLedger',
    },
    fundLedger: {
      invoke: {
        src: 'directFunding',
        data: 'directFundingArgs',
        onDone: 'fundTarget',
      },
    },
    fundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: 'ledgerUpdateArgs',
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {
  suitableChannelExists: function(x) {
    return true;
  },
};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
