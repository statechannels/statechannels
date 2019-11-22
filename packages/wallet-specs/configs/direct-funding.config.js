const config = {
  key: 'direct-funding',
  initial: 'updatePrefundOutcome',
  states: {
    updatePrefundOutcome: {
      invoke: {
        src: 'ledgerUpdate',
        data: context => {
          return {
            targetChannelID: context.targetChannelID,
            targetOutcome:
              'preDepositOutcome(context.targetChannelID, context.minimalOutcome)',
          };
        },
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
        data: context => ({
          targetChannelID: context.targetChannelID,
          targetOutcome: 'postDepositOutcome(context.targetChannelID)',
        }),
        onDone: 'success',
      },
    },
    success: { type: 'final' },
    failure: { type: 'final' },
  },
};
const guards = { safeToDeposit: x => true, funded: x => true };
const customActions = {};
const machine = Machine(config, { guards, actions: customActions });
