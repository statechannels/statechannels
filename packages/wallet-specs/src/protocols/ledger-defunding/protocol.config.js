const config = {
  key: 'ledger-defunding',
  initial: 'concludeTarget',
  states: {
    defundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: 'ledgerUpdateArgs',
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
