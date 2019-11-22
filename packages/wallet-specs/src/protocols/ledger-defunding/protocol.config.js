const config = {
  key: 'ledger-defunding',
  initial: 'concludeTarget',
  states: {
    concludeTarget: {
      invoke: {
        src: 'concludeChannel',
        data: context => ({ channelID: context.ledgerChannelID }),
        onDone: 'defundTarget',
      },
    },
    defundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: context => ({
          channelID: context.ledgerChannelID,
          outcome:
            'defundedOutcome( context.ledgerChannelID, context.targetChannelID)',
        }),
        onDone: 'success',
      },
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
