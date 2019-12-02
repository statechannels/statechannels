const config = {
  key: 'partial-withdrawal',
  initial: 'createReplacement',
  states: {
    createReplacement: {
      entry: 'assignNewChannelId',
      invoke: {
        src: 'createNullChannel',
        data: 'replacementChannelArgs',
        onDone: 'updateOldChannelOutcome',
      },
    },
    updateOldChannelOutcome: {
      invoke: {
        src: 'ledgerUpdate',
        data: 'concludeOutcome',
        onDone: 'concludeOldChannel',
      },
    },
    concludeOldChannel: {
      invoke: {
        src: 'concludeChannel',
        data: 'oldChannelId',
        onDone: 'transfer',
      },
    },
    transfer: {
      invoke: { src: 'transferAll', data: 'oldChannelId', onDone: 'success' },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
