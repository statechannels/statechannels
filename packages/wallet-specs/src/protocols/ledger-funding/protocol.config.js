const config = {
  key: 'ledger-funding',
  initial: 'waitForChannel',
  states: {
    waitForChannel: {
      initial: 'lookForExistingChannel',
      states: {
        lookForExistingChannel: {
          invoke: {
            src: 'findLedgerChannelId',
            onDone: [
              {
                target: 'success',
                cond: 'channelFound',
                actions: {
                  type: 'xstate.assign',
                  assignment: function(ctx, event) {
                    return __assign(__assign({}, ctx), {
                      ledgerChannelId: event.data.channelId,
                    });
                  },
                },
              },
              { target: 'determineLedgerChannel' },
            ],
          },
        },
        determineLedgerChannel: {
          invoke: { src: 'getNullChannelArgs', onDone: 'createNewLedger' },
        },
        createNewLedger: {
          invoke: {
            src: 'createNullChannel',
            data: function(_, _a) {
              var data = _a.data;
              return {
                channel: data.channel,
                outcome: data.outcome,
              };
            },
            onDone: {
              target: 'success',
              actions: {
                type: 'xstate.assign',
                assignment: function(ctx, event) {
                  return __assign(__assign({}, ctx), {
                    ledgerChannelId: event.data.channelId,
                  });
                },
              },
            },
            autoForward: true,
          },
        },
        success: { type: 'final' },
      },
      onDone: { target: 'fundLedger' },
    },
    fundLedger: {
      invoke: { src: 'directFunding', onDone: 'fundTarget', autoForward: true },
    },
    fundTarget: {
      initial: 'getTargetOutcome',
      states: {
        getTargetOutcome: {
          invoke: { src: 'getTargetOutcome', onDone: 'ledgerUpdate' },
        },
        ledgerUpdate: {
          invoke: {
            src: 'supportState',
            data: function(ctx, _a) {
              var data = _a.data;
              return {
                channelId: ctx.ledgerChannelId,
                outcome: data.outcome,
              };
            },
            autoForward: true,
            onDone: 'success',
          },
        },
        success: { type: 'final' },
      },
      onDone: 'success',
    },
    success: { type: 'final' },
  },
};
const guards = {};
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
