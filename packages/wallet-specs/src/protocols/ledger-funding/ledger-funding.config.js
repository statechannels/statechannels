const config = {
  key: 'ledger-funding',
  initial: 'waitForChannel',
  states: {
    waitForChannel: {
      initial: 'newChannel',
      states: {
        newChannel: {
          on: { '': { target: 'success', cond: 'suitableChannelExists' } },
          invoke: {
            src: 'createChannel',
            data: context => ({
              outcome: [context.targetChannelID, context.total],
            }),
            onDone: 'success',
          },
        },
        success: { type: 'final', actions: 'assignLedgerChannelId' },
      },
    },
    fundLedger: {
      initial: 'arrangeOutcome',
      states: {
        arrangeOutcome: { invoke: 'ledgerTopUp', onDone: 'fund' },
        fund: { invoke: 'directFunding', onDone: 'success' },
        success: { type: 'final' },
      },
      onDone: 'fundTarget',
    },
    fundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: context => ({
          channelID: context.ledgerChannelID,
          outcome: [context.targetChannelID, context.amount],
        }),
        onDone: 'success',
        onError: 'failure',
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = { suitableChannelExists: x => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
