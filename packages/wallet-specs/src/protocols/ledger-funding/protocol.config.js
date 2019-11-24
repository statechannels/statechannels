const config = {
  key: 'ledger-funding',
  initial: 'waitForChannel',
  states: {
    waitForChannel: {
      on: {
        '': {
          target: 'fundLedger',
          cond: 'suitableChannelExists',
          actions: 'assignExistingLedgerChannelID',
        },
      },
      invoke: {
        src: 'createChannel',
        data: function(context) {
          var _a = store_1.store.getLatestState(context.targetChannelID),
            outcome = _a.outcome,
            participants = _a.participants;
          return { participants: participants, outcome: outcome };
        },
      },
      onDone: 'fundLedger',
    },
    fundLedger: {
      invoke: {
        src: 'directFunding',
        data: function(context) {
          return {
            channelID: context.ledgerChannelID,
            minimalOutcome: store_1.store.getLatestState(
              context.targetChannelID
            ).outcome,
          };
        },
        onDone: 'fundTarget',
      },
    },
    fundTarget: {
      invoke: {
        src: 'ledgerUpdate',
        data: function(context) {
          return {
            channelID: context.ledgerChannelID,
            outcome: [context.targetChannelID, context.amount],
          };
        },
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
